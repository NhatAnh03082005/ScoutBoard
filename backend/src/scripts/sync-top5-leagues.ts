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
const SAFETY_RESERVE = 42; // Preserve ~40-42 requests for Transfer Sync

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapPositionToCanonical(rawPos?: string): { primary: string; group: string } {
  const p = (rawPos || '').toLowerCase().trim();
  if (p.includes('goal') || p === 'g' || p === 'gk') {
    return { primary: 'GK', group: 'GOALKEEPER' };
  }
  if (p.includes('def') || p === 'd') {
    return { primary: 'CB', group: 'DEFENDER' };
  }
  if (p.includes('mid') || p === 'm') {
    return { primary: 'CM', group: 'MIDFIELDER' };
  }
  if (p.includes('att') || p.includes('for') || p === 'f' || p === 'a') {
    return { primary: 'ST', group: 'FORWARD' };
  }
  return { primary: 'CM', group: 'MIDFIELDER' };
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

interface TargetLeague {
  id: number;
  name: string;
  country: string;
  seasonName: string;
  logo: string;
}

const TARGET_LEAGUES: TargetLeague[] = [
  {
    id: 135,
    name: 'Serie A',
    country: 'Italy',
    seasonName: 'Serie A 2024/2025',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
  },
  {
    id: 78,
    name: 'Bundesliga',
    country: 'Germany',
    seasonName: 'Bundesliga 2024/2025',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
  },
  {
    id: 61,
    name: 'Ligue 1',
    country: 'France',
    seasonName: 'Ligue 1 2024/2025',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
  },
];

async function main() {
  console.log('======================================================================');
  console.log('=== SCOUTBOARD: SYNC TOP 5 EUROPEAN LEAGUES (SERIE A, GER, FRA)    ===');
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
  const preComps = await client.query(`SELECT name, country FROM competitions ORDER BY name;`);
  console.log('[BEFORE SYNC] Competitions currently in DB:');
  console.table(preComps.rows);

  const preStats = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM competitions) as total_competitions,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM players) as total_players;
  `);
  console.table(preStats.rows[0]);

  // 2. Check API-Football Quota
  console.log('\nChecking API-Football quota via https...');
  const statusRes = await callApiWithRetry('/status');
  const reqInfo = statusRes?.response?.requests;
  const currentUsed = reqInfo?.current ?? 0;
  const limitDay = reqInfo?.limit_day ?? 100;
  let remainingToday = Math.max(0, limitDay - currentUsed);

  console.log(`API Quota: ${currentUsed}/${limitDay} requests used | Remaining: ${remainingToday}`);
  if (remainingToday < 50) {
    console.warn(`⚠️ Warning: Only ${remainingToday} requests remaining. Will proceed with available budget.`);
  }

  let totalTeamsSynced = 0;
  let totalPlayersSynced = 0;

  // 3. Process Each League
  for (const league of TARGET_LEAGUES) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`>>> PROCESSING LEAGUE: ${league.name} (${league.country}, ID: ${league.id})`);
    console.log(`----------------------------------------------------------------------`);

    // Ensure Competition exists in DB
    const compRes = await client.query(
      `
      INSERT INTO competitions (external_provider, external_id, name, country, type, logo_url, data_updated_at)
      VALUES ('API_FOOTBALL', $1, $2, $3, 'LEAGUE', $4, NOW())
      ON CONFLICT (external_provider, external_id) 
      DO UPDATE SET name = $2, country = $3, logo_url = $4, data_updated_at = NOW()
      RETURNING id;
    `,
      [String(league.id), league.name, league.country, league.logo],
    );
    const compId = compRes.rows[0].id;

    // Ensure Season exists in DB
    const seasonRes = await client.query(
      `
      INSERT INTO seasons (competition_id, external_provider, external_id, name, is_current, data_updated_at)
      VALUES ($1, 'API_FOOTBALL', $2, $3, true, NOW())
      ON CONFLICT (competition_id, external_provider, external_id)
      DO UPDATE SET name = $3, is_current = true, data_updated_at = NOW()
      RETURNING id;
    `,
      [compId, `${league.id}_${SEASON}`, league.seasonName],
    );
    const seasonId = seasonRes.rows[0].id;

    // Fetch Teams for this league (1 request)
    process.stdout.write(`Fetching teams for ${league.name}... `);
    const teamsApiData = await callApiWithRetry(`/teams?league=${league.id}&season=${SEASON}`);
    remainingToday--;
    await sleep(DELAY_BETWEEN_CALLS_MS);

    const teamItems = teamsApiData?.response || [];
    console.log(`✓ ${teamItems.length} teams received.`);

    for (let tIdx = 0; tIdx < teamItems.length; tIdx++) {
      if (remainingToday <= SAFETY_RESERVE) {
        console.warn(`\n⚠️ Remaining quota reached safety reserve (${remainingToday} reqs left). Halting to preserve quota for Transfers.`);
        break;
      }

      const item = teamItems[tIdx];
      const t = item.team;
      const v = item.venue;
      if (!t || !t.id) continue;

      const teamExtId = String(t.id);
      const teamName = t.name;
      const tla = t.code || (teamName.length >= 3 ? teamName.substring(0, 3).toUpperCase() : teamName.toUpperCase());
      const logoUrl = t.logo || null;
      const foundedYear = t.founded ? parseInt(String(t.founded), 10) : null;
      const venueName = v?.name || null;

      // Upsert Team
      const teamUpsert = await client.query(
        `
        INSERT INTO teams (external_provider, external_id, name, short_name, tla, country, founded_year, venue_name, logo_url, data_updated_at)
        VALUES ('API_FOOTBALL', $1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (external_provider, external_id)
        DO UPDATE SET name = $2, short_name = $3, tla = $4, country = $5, founded_year = $6, venue_name = $7, logo_url = $8, data_updated_at = NOW()
        RETURNING id;
      `,
        [teamExtId, teamName, teamName, tla, league.country, foundedYear, venueName, logoUrl],
      );
      const teamDbId = teamUpsert.rows[0].id;
      totalTeamsSynced++;

      // Link to season_teams
      await client.query(
        `
        INSERT INTO season_teams (season_id, team_id)
        VALUES ($1, $2)
        ON CONFLICT (season_id, team_id) DO NOTHING;
      `,
        [seasonId, teamDbId],
      );

      // Fetch Squad Players for this team (1 request)
      process.stdout.write(`  [${tIdx + 1}/${teamItems.length}] ${teamName} squad (Quota left: ${remainingToday})... `);
      try {
        const squadData = await callApiWithRetry(`/players/squads?team=${teamExtId}`);
        remainingToday--;

        const playersList = squadData?.response?.[0]?.players || [];
        let teamPlayerUpdated = 0;

        for (const pl of playersList) {
          if (!pl || !pl.id) continue;

          const playerExtId = String(pl.id);
          const playerName = pl.name || 'Unknown Player';
          const shirtNum = pl.number ? parseInt(String(pl.number), 10) : null;
          const photo = pl.photo || null;
          const rawPos = pl.position || 'Midfielder';
          const { primary: canonicalPos, group: posGroup } = mapPositionToCanonical(rawPos);

          // Upsert player
          const playerUpsert = await client.query(
            `
            INSERT INTO players (
              current_team_id, external_provider, external_id, name, short_name,
              primary_position, shirt_number, image_url, status, data_updated_at
            )
            VALUES ($1, 'API_FOOTBALL', $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())
            ON CONFLICT (external_provider, external_id)
            DO UPDATE SET
              current_team_id = $1,
              name = $3,
              short_name = $4,
              primary_position = COALESCE(players.primary_position, $5),
              shirt_number = COALESCE($6, players.shirt_number),
              image_url = COALESCE($7, players.image_url),
              data_updated_at = NOW()
            RETURNING id;
          `,
            [teamDbId, playerExtId, playerName, playerName, canonicalPos, shirtNum, photo],
          );
          const playerDbId = playerUpsert.rows[0].id;

          // Ensure canonical position in player_positions table
          await client.query(
            `
            INSERT INTO player_positions (player_id, position_code, is_primary)
            VALUES ($1, $2, true)
            ON CONFLICT (player_id, position_code) DO NOTHING;
          `,
            [playerDbId, canonicalPos],
          );

          // Ensure current team link in player_team_history
          await client.query(
            `
            INSERT INTO player_team_history (player_id, team_id, shirt_number, is_current)
            VALUES ($1, $2, $3, true)
            ON CONFLICT DO NOTHING;
          `,
            [playerDbId, teamDbId, shirtNum],
          );

          teamPlayerUpdated++;
          totalPlayersSynced++;
        }

        console.log(`✓ ${playersList.length} players (${teamPlayerUpdated} saved)`);
      } catch (err: any) {
        console.log(`❌ Error fetching squad: ${err.message}`);
      }

      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // 4. Final Post-Sync Audit
  console.log('\n======================================================================');
  console.log('=== TOP 5 LEAGUES SYNC AUDIT REPORT ===');
  console.log('======================================================================');

  const postComps = await client.query(`
    SELECT 
      c.name as competition,
      c.country,
      COUNT(DISTINCT t.id) as total_teams,
      COUNT(DISTINCT p.id) as total_players
    FROM competitions c
    LEFT JOIN seasons s ON s.competition_id = c.id
    LEFT JOIN season_teams st ON st.season_id = s.id
    LEFT JOIN teams t ON st.team_id = t.id
    LEFT JOIN players p ON p.current_team_id = t.id
    GROUP BY c.name, c.country
    ORDER BY total_teams DESC;
  `);
  console.table(postComps.rows);

  const postTotals = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM competitions) as total_competitions,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM players) as total_players;
  `);
  console.table(postTotals.rows[0]);

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
