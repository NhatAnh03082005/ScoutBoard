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

const DELAY_BETWEEN_CALLS_MS = 6200; // 6.2s delay strictly <= 10 reqs/min
const SAFETY_RESERVE = 2; // Never drop below 2 requests

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  console.log('=== SCOUTBOARD: SYNC TRANSFERS & CAREER TIMELINES BY TOP CLUBS     ===');
  console.log('======================================================================\n');

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  // 1. Initial State in DB
  const preHist = await client.query(`
    SELECT 
      COUNT(*) as total_team_history_rows,
      COUNT(DISTINCT player_id) as players_with_history
    FROM player_team_history;
  `);
  console.log('[BEFORE SYNC] Current Player Career Team History in DB:');
  console.table(preHist.rows[0]);

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

  // 3. Select Target Clubs: Top clubs by squad size / players
  // Prioritize biggest teams from Premier League, La Liga, Serie A, Bundesliga, Ligue 1
  const maxClubsToQuery = Math.min(40, remainingToday - SAFETY_RESERVE);
  const targetTeamsRes = await client.query(`
    SELECT t.id, t.name, t.external_id, t.country,
      COUNT(p.id) as squad_count
    FROM teams t
    JOIN players p ON p.current_team_id = t.id
    WHERE t.external_id IS NOT NULL AND t.country IN ('England', 'Spain', 'Italy', 'Germany', 'France')
    GROUP BY t.id, t.name, t.external_id, t.country
    ORDER BY squad_count DESC, t.name ASC
    LIMIT $1;
  `, [maxClubsToQuery]);

  const targetTeams = targetTeamsRes.rows;
  console.log(`\nSelected ${targetTeams.length} major clubs for Transfer History Sync:\n`);

  let totalTransfersProcessed = 0;
  let totalHistoryRowsInserted = 0;
  let shouldStop = false;

  for (let idx = 0; idx < targetTeams.length; idx++) {
    if (shouldStop || remainingToday <= SAFETY_RESERVE) {
      console.warn('\n⚠️ Remaining quota reached safety threshold. Stopping transfers loop.');
      break;
    }

    const team = targetTeams[idx];
    process.stdout.write(`[${idx + 1}/${targetTeams.length}] ${team.name} (${team.country}, ExtID: ${team.external_id}, Quota left: ${remainingToday})... `);

    try {
      const transferData = await callApiWithRetry(`/transfers?team=${team.external_id}`);
      remainingToday--;

      const items = transferData?.response || [];
      let clubTransfersInserted = 0;

      for (const item of items) {
        const pl = item.player;
        if (!pl || !pl.id) continue;

        const playerExtId = String(pl.id);

        // Find if this player exists in our DB
        const playerFind = await client.query(
          `SELECT id, current_team_id FROM players WHERE external_provider = 'API_FOOTBALL' AND external_id = $1 LIMIT 1;`,
          [playerExtId]
        );

        if (playerFind.rowCount === 0) continue;
        const playerDbId = playerFind.rows[0].id;
        const currentTeamId = playerFind.rows[0].current_team_id;

        const transfersList = item.transfers || [];
        for (const tr of transfersList) {
          totalTransfersProcessed++;
          const trDate = tr.date ? tr.date : null;
          const inTeam = tr.teams?.in;
          const outTeam = tr.teams?.out;

          // Process 'in' team
          if (inTeam && inTeam.id && inTeam.name) {
            const inTeamExtId = String(inTeam.id);
            // Ensure referenced team exists in teams table
            const ensureTeamRes = await client.query(
              `
              INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
              VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
              ON CONFLICT (external_provider, external_id) DO UPDATE SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
              RETURNING id;
            `,
              [inTeamExtId, inTeam.name, inTeam.logo || null]
            );
            const inTeamDbId = ensureTeamRes.rows[0].id;

            // Insert into player_team_history
            const isCurrent = inTeamDbId === currentTeamId;
            const histRes = await client.query(
              `
              INSERT INTO player_team_history (player_id, team_id, start_date, is_current)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT DO NOTHING
              RETURNING id;
            `,
              [playerDbId, inTeamDbId, trDate, isCurrent]
            );

            if (histRes.rowCount && histRes.rowCount > 0) {
              clubTransfersInserted++;
              totalHistoryRowsInserted++;
            }
          }
        }
      }

      console.log(`✓ ${items.length} player records (${clubTransfersInserted} career timeline entries saved)`);
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      if (err.message && (err.message.includes('rate') || err.message.includes('429'))) {
        shouldStop = true;
        break;
      }
    }

    if (idx < targetTeams.length - 1 && !shouldStop) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // 4. Final Post-Sync Verification
  console.log('\n======================================================================');
  console.log('=== TRANSFERS SYNC SUMMARY AUDIT ===');
  console.log('======================================================================');

  const postHist = await client.query(`
    SELECT 
      COUNT(*) as total_team_history_rows,
      COUNT(DISTINCT player_id) as players_with_history
    FROM player_team_history;
  `);
  console.log('\n[AFTER SYNC] Updated Player Career Team History in DB:');
  console.table(postHist.rows[0]);

  // Sample Stars Timeline
  const sampleStars = await client.query(`
    SELECT p.name, t.name as club_name, pth.start_date, pth.is_current
    FROM player_team_history pth
    JOIN players p ON pth.player_id = p.id
    JOIN teams t ON pth.team_id = t.id
    WHERE p.name IN ('Kylian Mbappé', 'J. Oblak', 'Robert Lewandowski', 'Erling Haaland', 'Jude Bellingham')
    ORDER BY p.name, pth.start_date DESC NULLS LAST
    LIMIT 20;
  `);
  console.log('\nSample Star Players Career History in DB:');
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
