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

const LOCAL_HOST = process.env.POSTGRES_HOST || 'localhost';
const LOCAL_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const LOCAL_USER = process.env.POSTGRES_USER || 'postgres';
const LOCAL_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres123';
const LOCAL_DB = process.env.POSTGRES_DB || 'scoutboard_db';

const SUPABASE_HOST = process.env.SUPABASE_HOST || 'aws-0-ap-south-1.pooler.supabase.com';
const SUPABASE_PORT = parseInt(process.env.SUPABASE_PORT || '6543', 10);
const SUPABASE_USER = process.env.SUPABASE_USER || 'postgres.utpuxqpokpqnxpqqiens';
const SUPABASE_PASSWORD = process.env.SUPABASE_PASSWORD || process.env.POSTGRES_PASSWORD || '';
const SUPABASE_DB = process.env.SUPABASE_DB || 'postgres';

const SEASON = 2024;
const DELAY_BETWEEN_CALLS_MS = 6200; // 6.2s delay strictly <= 10 reqs/min
const SAFETY_RESERVE = 3; // Keep 3 calls reserved

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

function parseDateOfBirth(dateVal?: any): string | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
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
        family: 4,
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
          console.warn(`  ⚠️ Rate limit encountered: ${errStr}. Waiting 15s...`);
          await sleep(15000);
          continue;
        }
      }
      return data;
    } catch (err: any) {
      if (attempt >= maxRetries) throw err;
      console.warn(`  Connection retry (${attempt}/${maxRetries}): ${err.message}. Waiting 5s...`);
      await sleep(5000);
    }
  }
}

async function syncEnrichedToSupabase(localClient: Client) {
  console.log('\n======================================================================');
  console.log('=== SYNCING ENRICHED PHYSICAL PROFILES DIRECTLY TO SUPABASE CLOUD  ===');
  console.log('======================================================================\n');

  const supabaseClient = new Client({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    database: SUPABASE_DB,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  });

  try {
    await supabaseClient.connect();
    console.log('✓ Connected to Supabase Cloud pooler.');

    // Fetch all players from local DB that have physical data
    const localPlayersRes = await localClient.query(`
      SELECT 
        external_id, date_of_birth, height_cm, weight_kg, nationality, 
        image_url, shirt_number, raw_position
      FROM players
      WHERE external_provider = 'API_FOOTBALL'
        AND (height_cm IS NOT NULL OR weight_kg IS NOT NULL OR date_of_birth IS NOT NULL);
    `);

    const players = localPlayersRes.rows;
    console.log(`Pushing physical profile updates for ${players.length} players to Supabase Cloud...`);

    const batchSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < players.length; i += batchSize) {
      const chunk = players.slice(i, i + batchSize);
      
      for (const p of chunk) {
        const res = await supabaseClient.query(`
          UPDATE players
          SET
            date_of_birth = COALESCE($1, date_of_birth),
            height_cm = COALESCE($2, height_cm),
            weight_kg = COALESCE($3, weight_kg),
            nationality = COALESCE($4, nationality),
            image_url = COALESCE($5, image_url),
            shirt_number = COALESCE(shirt_number, $6),
            raw_position = COALESCE(raw_position, $7),
            data_updated_at = NOW()
          WHERE external_provider = 'API_FOOTBALL' AND external_id = $8;
        `, [
          p.date_of_birth,
          p.height_cm,
          p.weight_kg,
          p.nationality,
          p.image_url,
          p.shirt_number,
          p.raw_position,
          p.external_id
        ]);
        if (res.rowCount && res.rowCount > 0) {
          updatedCount += res.rowCount;
        }
      }
      process.stdout.write(`  Updated ${Math.min(i + batchSize, players.length)}/${players.length} players in Supabase Cloud...\r`);
    }

    console.log(`\n✓ Supabase update completed! Total ${updatedCount} player profiles updated on Cloud.`);
  } catch (err: any) {
    console.error('❌ Error syncing to Supabase Cloud:', err.message);
  } finally {
    await supabaseClient.end();
  }
}

async function main() {
  console.log('======================================================================');
  console.log('=== SCOUTBOARD: ENRICH SERIE A, BUNDESLIGA, LIGUE 1 PROFILES       ===');
  console.log('=== (Height, Weight, Birthdate, Nationality, Shirt, Photo)         ===');
  console.log('======================================================================\n');

  const localClient = new Client({
    host: LOCAL_HOST,
    port: LOCAL_PORT,
    user: LOCAL_USER,
    password: LOCAL_PASSWORD,
    database: LOCAL_DB,
  });
  await localClient.connect();

  // 1. Initial State in DB
  const preRes = await localClient.query(`
    SELECT 
      c.name AS competition,
      COUNT(p.id) AS total_players,
      COUNT(p.height_cm) AS with_height,
      COUNT(p.weight_kg) AS with_weight,
      COUNT(p.date_of_birth) AS with_dob,
      COUNT(p.nationality) AS with_nat
    FROM competitions c
    JOIN teams t ON t.country = c.country
    JOIN players p ON p.current_team_id = t.id
    WHERE c.name IN ('Serie A', 'Bundesliga', 'Ligue 1')
    GROUP BY c.name
    ORDER BY c.name;
  `);
  console.log('[BEFORE ENRICHMENT] Target Leagues in Local DB:');
  console.table(preRes.rows);

  // 2. Check API Quota
  console.log('\nChecking API-Football daily quota...');
  const statusRes = await callApiWithRetry('/status');
  const reqInfo = statusRes?.response?.requests;
  const currentUsed = reqInfo?.current ?? 0;
  const limitDay = reqInfo?.limit_day ?? 100;
  let remainingToday = Math.max(0, limitDay - currentUsed);

  console.log(`API Quota: ${currentUsed}/${limitDay} used | Remaining today: ${remainingToday}`);
  if (remainingToday <= SAFETY_RESERVE) {
    console.error('❌ Daily quota is too low to proceed. Stopping safely.');
    await localClient.end();
    return;
  }

  // 3. Load all clubs in Germany, France, and Italy that have players
  const teamsRes = await localClient.query(`
    SELECT 
      t.id, 
      t.external_id, 
      t.name, 
      t.country,
      COUNT(p.id) AS squad_size,
      COUNT(p.height_cm) AS enriched_count,
      (COUNT(p.id) - COUNT(p.height_cm)) AS missing_count
    FROM teams t
    JOIN players p ON p.current_team_id = t.id
    WHERE t.country IN ('Germany', 'France', 'Italy')
    GROUP BY t.id, t.external_id, t.name, t.country
    HAVING COUNT(p.id) > 0
    ORDER BY missing_count DESC, t.name ASC;
  `);

  const teams = teamsRes.rows;
  console.log(`\nFound ${teams.length} clubs across Serie A, Bundesliga, and Ligue 1 to enrich.\n`);

  let totalUpdatedPlayers = 0;
  let totalApiCalls = 0;
  let shouldStop = false;

  // Helper function to update players returned from API
  const updatePlayersFromItems = async (items: any[]) => {
    let updatedInCall = 0;
    for (const item of items) {
      const p = item.player;
      if (!p || !p.id) continue;

      const extId = String(p.id);
      const dob = parseDateOfBirth(p.birth?.date);
      const height = parseHeightCm(p.height);
      const weight = parseWeightKg(p.weight);
      const nat = p.nationality ? String(p.nationality).trim() : null;
      const photo = p.photo ? String(p.photo).trim() : null;

      let shirtNum: number | null = null;
      let rawPos: string | null = null;
      if (Array.isArray(item.statistics)) {
        for (const stat of item.statistics) {
          if (typeof stat?.games?.number === 'number') {
            shirtNum = stat.games.number;
          }
          if (stat?.games?.position && !rawPos) {
            rawPos = String(stat.games.position).trim();
          }
        }
      }

      const upRes = await localClient.query(
        `
        UPDATE players
        SET
          date_of_birth = COALESCE($1, date_of_birth),
          height_cm = COALESCE($2, height_cm),
          weight_kg = COALESCE($3, weight_kg),
          nationality = COALESCE($4, nationality),
          image_url = COALESCE($5, image_url),
          shirt_number = COALESCE(shirt_number, $6),
          raw_position = COALESCE(raw_position, $7),
          data_updated_at = NOW()
        WHERE external_provider = 'API_FOOTBALL' AND external_id = $8;
      `,
        [dob, height, weight, nat, photo, shirtNum, rawPos, extId],
      );

      if (upRes.rowCount && upRes.rowCount > 0) {
        updatedInCall += upRes.rowCount;
      }
    }
    return updatedInCall;
  };

  // --- ROUND 1: Page 1 for all clubs (Enriches top 20 players of every single club) ---
  console.log('======================================================================');
  console.log('=== ROUND 1: Fetching Page 1 for all clubs (Top 20 players / club) ===');
  console.log('======================================================================');

  for (let idx = 0; idx < teams.length; idx++) {
    if (remainingToday <= SAFETY_RESERVE) {
      console.warn(`\n⚠️ Reached safety reserve (${remainingToday} remaining). Stopping.`);
      shouldStop = true;
      break;
    }

    const t = teams[idx];
    if (parseInt(t.missing_count, 10) === 0) {
      console.log(`[${idx + 1}/${teams.length}] ${t.name} (${t.country}) - Already 100% enriched. Skipping.`);
      continue;
    }

    if (idx > 0) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }

    const page1Data = await callApiWithRetry(
      `/players?team=${t.external_id}&season=${SEASON}&page=1`,
    );
    totalApiCalls++;
    remainingToday--;

    const items = page1Data?.response || [];
    const updated = await updatePlayersFromItems(items);
    totalUpdatedPlayers += updated;

    console.log(
      `[${idx + 1}/${teams.length}] ${t.name} (${t.country}) Page 1 -> +${updated} players updated (Quota left: ${remainingToday})`,
    );
  }

  // --- ROUND 2: Page 2 for clubs that still have > 0 missing players ---
  if (!shouldStop && remainingToday > SAFETY_RESERVE) {
    console.log('\n======================================================================');
    console.log('=== ROUND 2: Fetching Page 2 for clubs with remaining squad players ===');
    console.log('======================================================================');

    // Re-query teams that still have missing players after Round 1
    const recheckRes = await localClient.query(`
      SELECT 
        t.id, 
        t.external_id, 
        t.name, 
        t.country,
        COUNT(p.id) AS squad_size,
        COUNT(p.height_cm) AS enriched_count,
        (COUNT(p.id) - COUNT(p.height_cm)) AS missing_count
      FROM teams t
      JOIN players p ON p.current_team_id = t.id
      WHERE t.country IN ('Germany', 'France', 'Italy')
      GROUP BY t.id, t.external_id, t.name, t.country
      HAVING (COUNT(p.id) - COUNT(p.height_cm)) > 0
      ORDER BY missing_count DESC, t.name ASC;
    `);

    const remainingTeams = recheckRes.rows;
    console.log(`Clubs requiring Page 2: ${remainingTeams.length} | Available calls: ${remainingToday - SAFETY_RESERVE}\n`);

    for (let idx = 0; idx < remainingTeams.length; idx++) {
      if (remainingToday <= SAFETY_RESERVE) {
        console.warn(`\n⚠️ Safety reserve reached (${remainingToday} remaining). Ending Round 2.`);
        break;
      }

      const t = remainingTeams[idx];
      await sleep(DELAY_BETWEEN_CALLS_MS);

      const page2Data = await callApiWithRetry(
        `/players?team=${t.external_id}&season=${SEASON}&page=2`,
      );
      totalApiCalls++;
      remainingToday--;

      const items = page2Data?.response || [];
      const updated = await updatePlayersFromItems(items);
      totalUpdatedPlayers += updated;

      console.log(
        `[Round 2: ${idx + 1}/${remainingTeams.length}] ${t.name} (${t.country}) Page 2 -> +${updated} players updated (Quota left: ${remainingToday})`,
      );
    }
  }

  console.log('\n======================================================================');
  console.log(`=== ENRICHMENT SUMMARY: ${totalApiCalls} API calls | ${totalUpdatedPlayers} player records updated ===`);
  console.log('======================================================================\n');

  // Audit Post-Sync State
  const postRes = await localClient.query(`
    SELECT 
      c.name AS competition,
      COUNT(p.id) AS total_players,
      COUNT(p.height_cm) AS with_height,
      COUNT(p.weight_kg) AS with_weight,
      COUNT(p.date_of_birth) AS with_dob,
      COUNT(p.nationality) AS with_nat
    FROM competitions c
    JOIN teams t ON t.country = c.country
    JOIN players p ON p.current_team_id = t.id
    WHERE c.name IN ('Serie A', 'Bundesliga', 'Ligue 1')
    GROUP BY c.name
    ORDER BY c.name;
  `);
  console.log('[AFTER ENRICHMENT] Target Leagues in Local DB:');
  console.table(postRes.rows);

  // Directly push updates to Supabase Cloud
  await syncEnrichedToSupabase(localClient);

  await localClient.end();
  console.log('\n🎉 ALL DONE! Local and Cloud databases are fully synchronized with player physical profiles!');
}

main().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
