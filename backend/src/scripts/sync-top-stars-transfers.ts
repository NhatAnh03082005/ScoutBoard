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
const SAFETY_RESERVE = 2; // Always keep 2 requests in reserve

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

async function callApiWithRetry(endpoint: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await callApi(endpoint);
      if (res?.errors && Object.keys(res.errors).length > 0) {
        const errorMsg = JSON.stringify(res.errors);
        if (errorMsg.includes('rate') || errorMsg.includes('requests')) {
          console.warn(`\n⚠️ Rate limit warning on attempt ${attempt}: ${errorMsg}. Waiting 10s...`);
          await sleep(10000);
          continue;
        }
      }
      return res;
    } catch (err: any) {
      console.warn(`\n⚠️ Network error on attempt ${attempt}/${retries}: ${err.message}. Retrying...`);
      if (attempt < retries) {
        await sleep(3000 * attempt);
      } else {
        throw err;
      }
    }
  }
}

async function runTopStarsSync() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  console.log('======================================================================');
  console.log('=== SCOUTBOARD: SYNC 100% COMPLETE CAREER TRANSFERS FOR TOP STARS  ===');
  console.log('======================================================================\n');

  // 1. Check API-Football Quota
  console.log('Checking API-Football quota status...');
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

  // 2. Select Top Stars (up to remainingToday - SAFETY_RESERVE, capped at 98)
  const maxPlayersToQuery = Math.min(98, remainingToday - SAFETY_RESERVE);

  const playersRes = await client.query(`
    WITH priority_stars AS (
      SELECT p.id, p.name, p.external_id, p.current_team_id, t.name as team_name,
        CASE 
          WHEN p.name ILIKE '%Mbapp%' THEN 1
          WHEN p.name ILIKE '%Haaland%' THEN 2
          WHEN p.name ILIKE '%Kane%' AND t.name ILIKE '%Bayern%' THEN 3
          WHEN p.name ILIKE '%Bellingham%' AND t.name ILIKE '%Real%' THEN 4
          WHEN p.name ILIKE '%Vin%' AND t.name ILIKE '%Real%' THEN 5
          WHEN p.name ILIKE '%Yamal%' THEN 6
          WHEN p.name ILIKE '%Salah%' THEN 7
          WHEN p.name ILIKE '%Bruyne%' THEN 8
          WHEN p.name ILIKE '%Lewandowski%' THEN 9
          WHEN p.name ILIKE '%Lautaro%' THEN 10
          WHEN p.name ILIKE '%Rodri%' AND t.name ILIKE '%City%' THEN 11
          WHEN p.name ILIKE '%Wirtz%' THEN 12
          WHEN p.name ILIKE '%Musiala%' THEN 13
          WHEN p.name ILIKE '%Palmer%' THEN 14
          WHEN p.name ILIKE '%Saka%' THEN 15
          WHEN p.name ILIKE '%Foden%' THEN 16
          WHEN p.name ILIKE '%Dembel%' THEN 17
          WHEN p.name ILIKE '%Leao%' THEN 18
          WHEN p.name ILIKE '%Pedri%' THEN 19
          WHEN p.name ILIKE '%Valverde%' THEN 20
          WHEN p.name ILIKE '%Griezmann%' THEN 21
          WHEN p.name ILIKE '%Rice%' THEN 22
          WHEN p.name ILIKE '%Alvarez%' AND t.name ILIKE '%Atletico%' THEN 23
          WHEN p.name ILIKE '%Raphinha%' THEN 24
          WHEN p.name ILIKE '%Barella%' THEN 25
          WHEN p.name ILIKE '%Bastoni%' THEN 26
          WHEN p.name ILIKE '%Vlahovi%' THEN 27
          WHEN p.name ILIKE '%Kimmich%' THEN 28
          WHEN p.name ILIKE '%Davies%' AND t.name ILIKE '%Bayern%' THEN 29
          WHEN p.name ILIKE '%Hakimi%' THEN 30
          WHEN p.name ILIKE '%Barcola%' THEN 31
          WHEN p.name ILIKE '%David%' AND t.name ILIKE '%Lille%' THEN 32
          WHEN p.name ILIKE '%Lookman%' THEN 33
          WHEN p.name ILIKE '%Thuram%' AND t.name ILIKE '%Inter%' THEN 34
          WHEN p.name ILIKE '%Calhanoglu%' OR p.name ILIKE '%alhano%' THEN 35
          WHEN p.name ILIKE '%Saliba%' THEN 36
          WHEN p.name ILIKE '%Gabriel%' AND t.name ILIKE '%Arsenal%' THEN 37
          WHEN p.name ILIKE '%Odegaard%' OR p.name ILIKE '%degaard%' THEN 38
          WHEN p.name ILIKE '%Fernandes%' AND t.name ILIKE '%Manchester%' THEN 39
          WHEN p.name ILIKE '%Van Dijk%' OR p.name ILIKE '%Dijk%' THEN 40
          WHEN p.name ILIKE '%Alexander-Arnold%' OR p.name ILIKE '%Arnold%' THEN 41
          WHEN p.name ILIKE '%Diaz%' AND t.name ILIKE '%Liverpool%' THEN 42
          WHEN p.name ILIKE '%Mac Allister%' THEN 43
          WHEN p.name ILIKE '%Szoboszlai%' THEN 44
          WHEN p.name ILIKE '%Isak%' THEN 45
          WHEN p.name ILIKE '%Gordon%' AND t.name ILIKE '%Newcastle%' THEN 46
          WHEN p.name ILIKE '%Watkins%' THEN 47
          WHEN p.name ILIKE '%Son%' AND t.name ILIKE '%Tottenham%' THEN 48
          WHEN p.name ILIKE '%Gvardiol%' THEN 49
          WHEN p.name ILIKE '%Dias%' AND t.name ILIKE '%City%' THEN 50
          WHEN p.name ILIKE '%Silva%' AND t.name ILIKE '%City%' THEN 51
          WHEN p.name ILIKE '%Kovacic%' OR p.name ILIKE '%ovai%' THEN 52
          WHEN p.name ILIKE '%Mainoo%' THEN 53
          WHEN p.name ILIKE '%Garnacho%' THEN 54
          WHEN p.name ILIKE '%Caicedo%' THEN 55
          WHEN p.name ILIKE '%Enzo%' AND t.name ILIKE '%Chelsea%' THEN 56
          WHEN p.name ILIKE '%Jackson%' AND t.name ILIKE '%Chelsea%' THEN 57
          WHEN p.name ILIKE '%Nkunku%' THEN 58
          WHEN p.name ILIKE '%Sane%' OR (p.name ILIKE '%San%' AND t.name ILIKE '%Bayern%') THEN 59
          WHEN p.name ILIKE '%Gnabry%' THEN 60
          WHEN p.name ILIKE '%Coman%' THEN 61
          WHEN p.name ILIKE '%Upamecano%' THEN 62
          WHEN p.name ILIKE '%Kim%' AND t.name ILIKE '%Bayern%' THEN 63
          WHEN p.name ILIKE '%Tah%' THEN 64
          WHEN p.name ILIKE '%Frimpong%' THEN 65
          WHEN p.name ILIKE '%Grimaldo%' THEN 66
          WHEN p.name ILIKE '%Xhaka%' THEN 67
          WHEN p.name ILIKE '%Boniface%' THEN 68
          WHEN p.name ILIKE '%Brandt%' THEN 69
          WHEN p.name ILIKE '%Schlotterbeck%' THEN 70
          WHEN p.name ILIKE '%Kobel%' THEN 71
          WHEN p.name ILIKE '%Bremer%' THEN 72
          WHEN p.name ILIKE '%Dybala%' THEN 73
          WHEN p.name ILIKE '%Hernandez%' AND t.name ILIKE '%Milan%' THEN 74
          WHEN p.name ILIKE '%Maignan%' THEN 75
          WHEN p.name ILIKE '%Marquinhos%' THEN 76
          WHEN p.name ILIKE '%Zaire-Emery%' OR p.name ILIKE '%Za%re%' THEN 77
          WHEN p.name ILIKE '%Vitinha%' AND t.name ILIKE '%Paris%' THEN 78
          WHEN p.name ILIKE '%Mendes%' AND t.name ILIKE '%Paris%' THEN 79
          WHEN p.name ILIKE '%Donnarumma%' THEN 80
          WHEN p.name ILIKE '%Courtois%' THEN 81
          WHEN p.name ILIKE '%ter Stegen%' OR p.name ILIKE '%Stegen%' THEN 82
          WHEN p.name ILIKE '%Alisson%' THEN 83
          WHEN p.name ILIKE '%Ederson%' AND t.name ILIKE '%City%' THEN 84
          WHEN p.name ILIKE '%Raya%' THEN 85
          WHEN p.name ILIKE '%Martinez%' AND t.name ILIKE '%Aston%' THEN 86
          WHEN p.name ILIKE '%Oblak%' THEN 87
          WHEN p.name ILIKE '%Carvajal%' THEN 88
          WHEN p.name ILIKE '%Camavinga%' THEN 89
          WHEN p.name ILIKE '%Tchouameni%' OR p.name ILIKE '%chouam%' THEN 90
          WHEN p.name ILIKE '%Gavi%' THEN 91
          WHEN p.name ILIKE '%Jong%' AND t.name ILIKE '%Barcelona%' THEN 92
          WHEN p.name ILIKE '%Cubarsi%' OR p.name ILIKE '%ubars%' THEN 93
          WHEN p.name ILIKE '%Modric%' OR p.name ILIKE '%odri%' THEN 94
          ELSE 999
        END as priority,
        COALESCE(pss.minutes_played, 0) as minutes_played
      FROM players p
      JOIN teams t ON t.id = p.current_team_id
      LEFT JOIN player_season_statistics pss ON pss.player_id = p.id
      WHERE p.external_id IS NOT NULL AND p.external_provider = 'API_FOOTBALL'
    )
    SELECT id, name, team_name, external_id, current_team_id
    FROM priority_stars
    ORDER BY priority ASC, minutes_played DESC
    LIMIT $1;
  `, [maxPlayersToQuery]);

  const targetPlayers = playersRes.rows;
  console.log(`Selected ${targetPlayers.length} Top Star players for full career transfers sync.\n`);

  let totalTransfersProcessed = 0;
  let totalHistoryUpserted = 0;
  let shouldStop = false;

  for (let idx = 0; idx < targetPlayers.length; idx++) {
    if (shouldStop || remainingToday <= SAFETY_RESERVE) {
      console.warn('\n⚠️ Quota limit safety threshold reached. Stopping gracefully.');
      break;
    }

    const player = targetPlayers[idx];
    process.stdout.write(`[${idx + 1}/${targetPlayers.length}] ${player.name} (${player.team_name}, ExtID: ${player.external_id}, Left: ${remainingToday})... `);

    try {
      const data = await callApiWithRetry(`/transfers?player=${player.external_id}`);
      remainingToday--;

      const playerTransfersObj = data?.response?.[0];
      const transfersList: any[] = playerTransfersObj?.transfers || [];

      let playerEntriesSaved = 0;

      // Sort transfers chronologically by date ascending
      const sortedTransfers = [...transfersList].sort((a, b) => {
        if (!a.date) return -1;
        if (!b.date) return 1;
        return a.date.localeCompare(b.date);
      });

      for (let tIdx = 0; tIdx < sortedTransfers.length; tIdx++) {
        const tr = sortedTransfers[tIdx];
        const trDate = tr.date || null;
        const inTeam = tr.teams?.in;
        const outTeam = tr.teams?.out;

        // 1. Process Out Team (previous team where player played and left on trDate)
        if (outTeam && outTeam.id && outTeam.name) {
          const outTeamExtId = String(outTeam.id);
          const outTeamRes = await client.query(
            `
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `,
            [outTeamExtId, outTeam.name, outTeam.logo || null]
          );
          const outTeamDbId = outTeamRes.rows[0].id;

          // If this outTeam doesn't already have a history record for this player, insert it with end_date = trDate
          // If it exists, ensure end_date is recorded
          const upsertOut = await client.query(
            `
            INSERT INTO player_team_history (player_id, team_id, end_date, is_current)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = false
            RETURNING id;
          `,
            [player.id, outTeamDbId, trDate]
          );
          if (upsertOut.rowCount && upsertOut.rowCount > 0) {
            playerEntriesSaved++;
            totalHistoryUpserted++;
          }
        }

        // 2. Process In Team (team player joined on trDate)
        if (inTeam && inTeam.id && inTeam.name) {
          const inTeamExtId = String(inTeam.id);
          const inTeamRes = await client.query(
            `
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `,
            [inTeamExtId, inTeam.name, inTeam.logo || null]
          );
          const inTeamDbId = inTeamRes.rows[0].id;
          const isCurrent = inTeamDbId === player.current_team_id;

          // Next transfer might tell us when the player left this inTeam
          let nextEndDate: string | null = null;
          if (tIdx < sortedTransfers.length - 1 && !isCurrent) {
            nextEndDate = sortedTransfers[tIdx + 1]?.date || null;
          }

          const upsertIn = await client.query(
            `
            INSERT INTO player_team_history (player_id, team_id, start_date, end_date, is_current)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = EXCLUDED.is_current
            RETURNING id;
          `,
            [player.id, inTeamDbId, trDate, nextEndDate, isCurrent]
          );
          if (upsertIn.rowCount && upsertIn.rowCount > 0) {
            playerEntriesSaved++;
            totalHistoryUpserted++;
          }
        }

        totalTransfersProcessed++;
      }

      // 3. Remove redundant NULL start_date rows for this player if a real start_date row exists
      await client.query(`
        DELETE FROM player_team_history p1
        WHERE p1.player_id = $1
          AND p1.start_date IS NULL
          AND EXISTS (
            SELECT 1 FROM player_team_history p2
            WHERE p2.player_id = p1.player_id
              AND p2.team_id = p1.team_id
              AND p2.start_date IS NOT NULL
          );
      `, [player.id]);

      console.log(`✓ ${sortedTransfers.length} career transfers (${playerEntriesSaved} timeline milestones)`);
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      if (err.message && (err.message.includes('rate') || err.message.includes('429'))) {
        shouldStop = true;
        break;
      }
    }

    if (idx < targetPlayers.length - 1 && !shouldStop) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // 4. Summary & Verification
  console.log('\n======================================================================');
  console.log('=== SYNC TOP STARS SUMMARY AUDIT ===');
  console.log('======================================================================');
  const postCount = await client.query('SELECT count(*) FROM player_team_history;');
  console.log(`Total rows in player_team_history: ${postCount.rows[0].count}`);

  const sampleRes = await client.query(`
    SELECT p.name, t.name as team_name, pth.start_date, pth.end_date, pth.is_current
    FROM player_team_history pth
    JOIN players p ON p.id = pth.player_id
    JOIN teams t ON t.id = pth.team_id
    WHERE p.name ILIKE '%Mbapp%' OR p.name ILIKE '%Kane%' OR p.name ILIKE '%Bellingham%'
    ORDER BY p.name, pth.start_date ASC NULLS FIRST;
  `);
  console.log('\nSample Star Players Complete Career Timeline in DB:');
  console.table(sampleRes.rows);

  const finalStatus = await callApiWithRetry('/status');
  const finalUsed = finalStatus?.response?.requests?.current ?? 'unknown';
  const finalLimit = finalStatus?.response?.requests?.limit_day ?? 100;
  console.log(`\nFinal API Quota: ${finalUsed}/${finalLimit} requests used | Remaining: ${finalLimit - finalUsed}\n`);

  await client.end();
}

runTopStarsSync().catch(console.error);
