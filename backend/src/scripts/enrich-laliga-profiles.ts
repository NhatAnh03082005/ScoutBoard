import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as dns from 'dns';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY =
  process.env.API_FOOTBALL_KEY ||
  process.env.API_FOOTBALL_API_KEY ||
  '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';
const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres123';
const DB_NAME = process.env.POSTGRES_DB || 'scoutboard_db';

const SEASON = 2024;
const DELAY_BETWEEN_CALLS_MS = 6200; // 6.2s delay strictly <= 10 reqs/min
const SAFETY_RESERVE = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseHeightCm(heightVal?: any): number | null {
  if (heightVal === null || heightVal === undefined) return null;
  const match = String(heightVal).match(/(\d+)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    return !isNaN(val) && val > 50 && val < 250 ? val : null;
  }
  return null;
}

function parseWeightKg(weightVal?: any): number | null {
  if (weightVal === null || weightVal === undefined) return null;
  const match = String(weightVal).match(/(\d+)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    return !isNaN(val) && val > 30 && val < 200 ? val : null;
  }
  return null;
}

function callApi(endpoint: string): Promise<any> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path: cleanPath,
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
          Accept: 'application/json',
        },
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (err) {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout after 20000ms on ${cleanPath}`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function callApiWithRetry(endpoint: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await callApi(endpoint);
      if (data?.errors && Object.keys(data.errors).length > 0) {
        const errStr = JSON.stringify(data.errors);
        if (errStr.includes('rate') || errStr.includes('limit')) {
          console.warn(`  ⚠️ Rate limit: ${errStr}. Waiting 10s...`);
          await sleep(10000);
          continue;
        }
      }
      return data;
    } catch (err: any) {
      if (attempt >= maxRetries) throw err;
      console.warn(`  Connection retry (${attempt}/${maxRetries}): ${err.message}. Waiting 4s...`);
      await sleep(4000);
    }
  }
}

async function main() {
  console.log('======================================================================');
  console.log('=== SCOUTBOARD: ENRICH LA LIGA PLAYER PHYSICAL PROFILES (HIGH-ACC) ===');
  console.log('======================================================================\n');

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  // 1. Check Initial State in DB
  const preRes = await client.query(`
    SELECT
      COUNT(*) AS total_laliga_players,
      COUNT(date_of_birth) AS with_dob,
      COUNT(height_cm) AS with_height,
      COUNT(weight_kg) AS with_weight,
      COUNT(nationality) AS with_nationality,
      COUNT(shirt_number) AS with_shirt
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE t.country = 'Spain';
  `);
  console.log('[BEFORE SYNC] Current La Liga Players Physical Attributes in DB:');
  console.table(preRes.rows[0]);

  // 2. Check API-Football Quota
  console.log('\nChecking API-Football quota via https...');
  const statusRes = await callApiWithRetry('/status');
  const reqInfo = statusRes?.response?.requests;
  const currentUsed = reqInfo?.current ?? 0;
  const limitDay = reqInfo?.limit_day ?? 100;
  let remainingToday = Math.max(0, limitDay - currentUsed);

  console.log(`API Quota: ${currentUsed}/${limitDay} requests used | Remaining: ${remainingToday}`);
  if (remainingToday <= SAFETY_RESERVE) {
    console.error('❌ Daily quota is too low to proceed. Stopping safely.');
    await client.end();
    return;
  }

  // 3. Load all 20 La Liga teams sorted by most missing players first
  const teamsRes = await client.query(`
    SELECT t.id, t.name, t.external_id,
      COUNT(p.id) as squad_size,
      COUNT(p.height_cm) as enriched_size,
      (COUNT(p.id) - COUNT(p.height_cm)) as missing_count
    FROM teams t
    JOIN players p ON p.current_team_id = t.id
    WHERE t.country = 'Spain'
    GROUP BY t.id, t.name, t.external_id
    ORDER BY missing_count DESC, t.name ASC;
  `);
  const teams = teamsRes.rows;
  console.log(`\nFound ${teams.length} La Liga teams to audit and enrich:\n`);

  let totalUpdatedPlayers = 0;
  let totalApiCallsMade = 0;
  let shouldStop = false;

  for (let tIdx = 0; tIdx < teams.length; tIdx++) {
    if (shouldStop || remainingToday <= SAFETY_RESERVE) {
      console.warn('\n⚠️ Safety reserve reached. Stopping loop safely.');
      break;
    }

    const team = teams[tIdx];
    const teamName = team.name;
    const teamExtId = team.external_id;

    console.log(`[Team ${tIdx + 1}/${teams.length}] ${teamName} (Squad: ${team.squad_size}, Missing: ${team.missing_count})`);

    // Only process teams that have missing physical profiles
    if (parseInt(team.missing_count, 10) === 0) {
      console.log(`  ✓ All players already enriched! Skipping.\n`);
      continue;
    }

    // Step through up to 3 pages for this team
    let maxPagesForTeam = 3;
    for (let page = 1; page <= maxPagesForTeam; page++) {
      if (remainingToday <= SAFETY_RESERVE) {
        shouldStop = true;
        break;
      }

      process.stdout.write(`  -> Page ${page}... `);
      try {
        const pageData = await callApiWithRetry(
          `/players?team=${teamExtId}&season=${SEASON}&page=${page}`,
        );
        totalApiCallsMade++;
        remainingToday--;

        if (pageData?.paging?.total) {
          maxPagesForTeam = Math.min(pageData.paging.total, 3);
        }

        const items = pageData?.response || [];
        if (items.length === 0) {
          console.log(`(0 players returned)`);
          break;
        }

        let pageUpdated = 0;
        for (const item of items) {
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
              if (typeof stat?.games?.number === 'number') {
                shirtNum = stat.games.number;
                break;
              }
            }
          }

          // Primary update by external_id
          const upRes = await client.query(
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

          if (upRes.rowCount && upRes.rowCount > 0) {
            pageUpdated += upRes.rowCount;
            totalUpdatedPlayers += upRes.rowCount;
          } else {
            // Fallback match by name in same team
            const fallbackRes = await client.query(
              `
              UPDATE players
              SET
                date_of_birth = COALESCE($1, date_of_birth),
                height_cm = COALESCE($2, height_cm),
                weight_kg = COALESCE($3, weight_kg),
                nationality = COALESCE($4, nationality),
                image_url = COALESCE($5, image_url),
                shirt_number = COALESCE(shirt_number, $6),
                external_id = $7,
                data_updated_at = NOW()
              WHERE current_team_id = $8 AND (LOWER(name) = LOWER($9) OR LOWER(short_name) = LOWER($9))
            `,
              [dob, height, weight, nat, photo, shirtNum, extId, team.id, p.name],
            );

            if (fallbackRes.rowCount && fallbackRes.rowCount > 0) {
              pageUpdated += fallbackRes.rowCount;
              totalUpdatedPlayers += fallbackRes.rowCount;
            }
          }
        }

        console.log(`✓ ${items.length} players received (${pageUpdated} updated in DB, Total New Updates: ${totalUpdatedPlayers})`);

        if (page >= maxPagesForTeam) break;

        await sleep(DELAY_BETWEEN_CALLS_MS);
      } catch (err: any) {
        console.log(`❌ Error on team ${teamExtId} page ${page}: ${err.message}`);
        if (err.message && (err.message.includes('rate') || err.message.includes('429'))) {
          shouldStop = true;
          break;
        }
      }
    }

    if (tIdx < teams.length - 1 && !shouldStop) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // 4. Final Post-Sync Verification
  console.log('\n======================================================================');
  console.log('=== FINAL AUDIT REPORT ===');
  console.log('======================================================================');
  const postRes = await client.query(`
    SELECT
      COUNT(*) AS total_laliga_players,
      COUNT(date_of_birth) AS with_dob,
      COUNT(height_cm) AS with_height,
      COUNT(weight_kg) AS with_weight,
      COUNT(nationality) AS with_nationality,
      COUNT(shirt_number) AS with_shirt
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE t.country = 'Spain';
  `);
  console.log('\n[AFTER SYNC] Updated La Liga Players Physical Attributes in DB:');
  console.table(postRes.rows[0]);

  // Sample Stars Audit
  const sampleStars = await client.query(`
    SELECT p.name, t.name as team, p.date_of_birth, p.nationality, p.height_cm, p.weight_kg, p.shirt_number
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.name IN ('Lamine Yamal', 'Pau Cubarsí Paredes', 'Pedri', 'Gavi', 'Kylian Mbappé', 'J. Oblak', 'Vinícius Júnior', 'Raphinha', 'Dani Olmo')
    ORDER BY t.name, p.name;
  `);
  console.log('\nKey Stars Profile Status:');
  console.table(sampleStars.rows);

  try {
    const finalStatus = await callApiWithRetry('/status');
    const finalReqInfo = finalStatus?.response?.requests;
    console.log(`\nFinal API Quota: ${finalReqInfo?.current ?? '?'}/${finalReqInfo?.limit_day ?? 100} requests used | Remaining: ${Math.max(0, (finalReqInfo?.limit_day ?? 100) - (finalReqInfo?.current ?? 0))}\n`);
  } catch (e) {}

  await client.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
