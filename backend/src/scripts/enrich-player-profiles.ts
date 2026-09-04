import { Client } from 'pg';
import * as https from 'https';
import * as dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const API_KEY = process.env.API_FOOTBALL_KEY || '02ada4bba01560e3ca554bf514f793ec';
const BASE_HOST = 'v3.football.api-sports.io';
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres123@localhost:5432/scoutboard_db';

const LEAGUE_ID = 39; // Premier League
const SEASON = 2024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseHeightCm(heightStr?: string | null): number | null {
  if (!heightStr) return null;
  const match = String(heightStr).match(/(\d+)\s*(?:cm)?/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    return !isNaN(val) && val > 50 && val < 250 ? val : null;
  }
  return null;
}

function parseWeightKg(weightStr?: string | null): number | null {
  if (!weightStr) return null;
  const match = String(weightStr).match(/(\d+)\s*(?:kg)?/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    return !isNaN(val) && val > 30 && val < 200 ? val : null;
  }
  return null;
}

function callApi(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path: path.startsWith('/') ? path : `/${path}`,
        method: 'GET',
        family: 4,
        headers: {
          'x-apisports-key': API_KEY,
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.slice(0, 100)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.end();
  });
}

async function main() {
  console.log('====================================================');
  console.log('API-FOOTBALL PLAYER PROFILE BATCH ENRICHMENT');
  console.log('====================================================');

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // 1. Initial Coverage Query
  const preRes = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(date_of_birth) AS dob,
      COUNT(height_cm) AS height,
      COUNT(weight_kg) AS weight,
      COUNT(nationality) AS nationality,
      COUNT(preferred_foot) AS preferred_foot,
      COUNT(image_url) AS image_url,
      COUNT(shirt_number) AS shirt_number,
      COUNT(primary_position) AS primary_position,
      COUNT(raw_position) AS raw_position
    FROM players;
  `);

  console.log('\n[PRE-SYNC] Player Profile Field Counts:');
  console.table(preRes.rows[0]);

  // 2. Check API Status & Quota
  console.log('\nChecking API status & quota...');
  const statusRes = await callApi('/status');
  const requestsInfo = statusRes?.response?.requests;
  console.log(
    `Quota: ${requestsInfo?.current ?? '?'}/${requestsInfo?.limit_day ?? '?'} used.`,
  );

  const remainingQuota =
    (requestsInfo?.limit_day || 100) - (requestsInfo?.current || 0);
  console.log(`Remaining quota today: ${remainingQuota}`);

  if (remainingQuota < 5) {
    console.warn('CRITICAL: Quota too low to proceed with batch enrichment.');
    await client.end();
    return;
  }

  // 3. Fetch First Page to Get Total Pages
  console.log(`\nFetching page 1 for League ${LEAGUE_ID}, Season ${SEASON}...`);
  const firstPage = await callApi(
    `/players?league=${LEAGUE_ID}&season=${SEASON}&page=1`,
  );
  const totalPages = firstPage?.paging?.total || 57;
  console.log(`Total pages to fetch: ${totalPages}`);

  let totalEnrichedInDb = 0;
  let totalApiPlayersProcessed = 0;
  let apiCallsUsed = 1; // already called /status and /page=1

  // Process Page 1 items
  for (const item of firstPage?.response || []) {
    totalApiPlayersProcessed++;
    const p = item.player;
    if (!p || !p.id) continue;

    const extId = String(p.id);
    const dob = p.birth?.date ? String(p.birth.date).trim() : null;
    const height = parseHeightCm(p.height);
    const weight = parseWeightKg(p.weight);
    const nat = p.nationality ? String(p.nationality).trim() : null;
    const photo = p.photo ? String(p.photo).trim() : null;

    // Check games.number from statistics
    let shirtNum: number | null = null;
    if (Array.isArray(item.statistics)) {
      for (const stat of item.statistics) {
        if (
          stat?.games?.number !== undefined &&
          stat?.games?.number !== null &&
          typeof stat.games.number === 'number'
        ) {
          shirtNum = stat.games.number;
          break;
        }
      }
    }

    const updateRes = await client.query(
      `
      UPDATE players
      SET
        date_of_birth = COALESCE($1, date_of_birth),
        height_cm = COALESCE($2, height_cm),
        weight_kg = COALESCE($3, weight_kg),
        nationality = COALESCE($4, nationality),
        image_url = COALESCE($5, image_url),
        shirt_number = COALESCE(shirt_number, $6),
        data_updated_at = NOW()
      WHERE external_provider = 'API_FOOTBALL' AND external_id = $7
    `,
      [dob, height, weight, nat, photo, shirtNum, extId],
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      totalEnrichedInDb += updateRes.rowCount;
    }
  }

  console.log(
    `[Page 1/${totalPages}] Processed ${firstPage?.response?.length ?? 0} players (Cumulative DB matches: ${totalEnrichedInDb})`,
  );

  // 4. Iterate Remaining Pages (2 to totalPages)
  for (let page = 2; page <= totalPages; page++) {
    // Safety check: leave at least 3 quota for verification
    if (remainingQuota - apiCallsUsed <= 2) {
      console.warn(`Approaching daily quota limit. Stopping safely at page ${page - 1}.`);
      break;
    }

    await sleep(350); // Respect rate limit (safe pacing)

    try {
      const pageData = await callApi(
        `/players?league=${LEAGUE_ID}&season=${SEASON}&page=${page}`,
      );
      apiCallsUsed++;

      const items = pageData?.response || [];
      let pageMatches = 0;

      for (const item of items) {
        totalApiPlayersProcessed++;
        const p = item.player;
        if (!p || !p.id) continue;

        const extId = String(p.id);
        const dob = p.birth?.date ? String(p.birth.date).trim() : null;
        const height = parseHeightCm(p.height);
        const weight = parseWeightKg(p.weight);
        const nat = p.nationality ? String(p.nationality).trim() : null;
        const photo = p.photo ? String(p.photo).trim() : null;

        let shirtNum: number | null = null;
        if (Array.isArray(item.statistics)) {
          for (const stat of item.statistics) {
            if (
              stat?.games?.number !== undefined &&
              stat?.games?.number !== null &&
              typeof stat.games.number === 'number'
            ) {
              shirtNum = stat.games.number;
              break;
            }
          }
        }

        const updateRes = await client.query(
          `
          UPDATE players
          SET
            date_of_birth = COALESCE($1, date_of_birth),
            height_cm = COALESCE($2, height_cm),
            weight_kg = COALESCE($3, weight_kg),
            nationality = COALESCE($4, nationality),
            image_url = COALESCE($5, image_url),
            shirt_number = COALESCE(shirt_number, $6),
            data_updated_at = NOW()
          WHERE external_provider = 'API_FOOTBALL' AND external_id = $7
        `,
          [dob, height, weight, nat, photo, shirtNum, extId],
        );

        if (updateRes.rowCount && updateRes.rowCount > 0) {
          pageMatches += updateRes.rowCount;
          totalEnrichedInDb += updateRes.rowCount;
        }
      }

      if (page % 5 === 0 || page === totalPages) {
        console.log(
          `[Page ${page}/${totalPages}] Processed ${items.length} players (Page matches: ${pageMatches}, Total DB matched: ${totalEnrichedInDb})`,
        );
      }
    } catch (err: any) {
      console.error(`Error on page ${page}:`, err.message);
      // Continue to next page without failing the entire batch
    }
  }

  console.log('\n====================================================');
  console.log('ENRICHMENT PIPELINE COMPLETED');
  console.log(`API calls used in this run: ${apiCallsUsed}`);
  console.log(`Total API player records processed: ${totalApiPlayersProcessed}`);
  console.log(`Total player updates in DB: ${totalEnrichedInDb}`);
  console.log('====================================================');

  // 5. Post-Sync Coverage Query
  const postRes = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(date_of_birth) AS dob,
      COUNT(height_cm) AS height,
      COUNT(weight_kg) AS weight,
      COUNT(nationality) AS nationality,
      COUNT(preferred_foot) AS preferred_foot,
      COUNT(image_url) AS image_url,
      COUNT(shirt_number) AS shirt_number,
      COUNT(primary_position) AS primary_position,
      COUNT(raw_position) AS raw_position
    FROM players;
  `);

  console.log('\n[POST-SYNC] Player Profile Field Counts:');
  console.table(postRes.rows[0]);

  // 6. Check final quota
  const finalStatus = await callApi('/status');
  console.log(
    `Final Quota: ${finalStatus?.response?.requests?.current}/${finalStatus?.response?.requests?.limit_day} used today.`,
  );

  await client.end();
}

main().catch((err) => {
  console.error('Fatal error during enrichment:', err);
  process.exit(1);
});
