import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as dns from 'dns';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';

const LOCAL_CLIENT = new Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
});

const SUPABASE_CLIENT = new Client({
  host: process.env.SUPABASE_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_PORT || '6543', 10),
  user: process.env.SUPABASE_USER || 'postgres.utpuxqpokpqnxpqqiens',
  password: process.env.SUPABASE_PASSWORD || '03082005Anhle@@',
  database: process.env.SUPABASE_DB || 'postgres',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
});

const DELAY_MS = 6200; // strictly <= 10 reqs/min
const SAFETY_RESERVE = 2; // Always keep 2 requests in reserve
const TARGET_PLAYERS_COUNT = 85;

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
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${cleanPath}`));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('======================================================================');
  console.log('=== SYNC CAREER TRANSFERS FOR 85 TOP STARS ACROSS TOP 5 LEAGUES    ===');
  console.log('======================================================================\n');

  await LOCAL_CLIENT.connect();
  await SUPABASE_CLIENT.connect();
  console.log('✓ Connected to Local DB and Supabase Cloud.');

  // 1. Check API quota
  const statusRes = await callApi('/status');
  const reqInfo = statusRes?.response?.requests;
  const currentUsed = reqInfo?.current ?? 0;
  const limitDay = reqInfo?.limit_day ?? 100;
  let remainingToday = Math.max(0, limitDay - currentUsed);

  console.log(`API Quota: ${currentUsed}/${limitDay} used | Remaining today: ${remainingToday}`);
  if (remainingToday <= SAFETY_RESERVE) {
    console.error('❌ Daily quota exhausted or too low. Stopping.');
    await LOCAL_CLIENT.end();
    await SUPABASE_CLIENT.end();
    return;
  }

  const maxToQuery = Math.min(TARGET_PLAYERS_COUNT, remainingToday - SAFETY_RESERVE);

  // 2. Select priority stars that only have 1 (or 0) team history record
  const playersRes = await SUPABASE_CLIENT.query(`
    WITH player_history_count AS (
      SELECT player_id, count(*) as hist_count
      FROM player_team_history
      GROUP BY player_id
    ),
    candidates AS (
      SELECT 
        p.id, 
        p.name, 
        p.external_id, 
        p.current_team_id, 
        t.name as team_name,
        c.name as comp_name,
        COALESCE(phc.hist_count, 0) as hist_count,
        CASE 
          -- Top Stars without full career transfers yet
          WHEN p.name ILIKE '%Wirtz%' THEN 1
          WHEN p.name ILIKE '%Musiala%' THEN 2
          WHEN p.name ILIKE '%Saka%' THEN 3
          WHEN p.name ILIKE '%Dimarco%' THEN 4
          WHEN p.name ILIKE '%Leao%' OR p.name ILIKE '%Leão%' THEN 5
          WHEN p.name ILIKE '%Hernandez%' AND t.name ILIKE '%Milan%' THEN 6
          WHEN p.name ILIKE '%Vlahovic%' OR p.name ILIKE '%Vlahović%' THEN 7
          WHEN p.name ILIKE '%Kvaratskhelia%' THEN 8
          WHEN p.name ILIKE '%Dembele%' OR p.name ILIKE '%Dembélé%' THEN 9
          WHEN p.name ILIKE '%Barcola%' THEN 10
          WHEN p.name ILIKE '%Frimpong%' THEN 11
          WHEN p.name ILIKE '%Grimaldo%' THEN 12
          WHEN p.name ILIKE '%Xhaka%' THEN 13
          WHEN p.name ILIKE '%Boniface%' THEN 14
          WHEN p.name ILIKE '%Tah%' AND t.name ILIKE '%Leverkusen%' THEN 15
          WHEN p.name ILIKE '%Marmoush%' THEN 16
          WHEN p.name ILIKE '%Ekitike%' OR p.name ILIKE '%Ekitiké%' THEN 17
          WHEN p.name ILIKE '%Gotze%' OR p.name ILIKE '%Götze%' THEN 18
          WHEN p.name ILIKE '%Kramaric%' OR p.name ILIKE '%Kramarić%' THEN 19
          WHEN p.name ILIKE '%Pedri%' THEN 20
          WHEN p.name ILIKE '%Gavi%' THEN 21
          WHEN p.name ILIKE '%Jong%' AND t.name ILIKE '%Barcelona%' THEN 22
          WHEN p.name ILIKE '%Cubarsi%' OR p.name ILIKE '%ubars%' THEN 23
          WHEN p.name ILIKE '%Valverde%' AND t.name ILIKE '%Real%' THEN 24
          WHEN p.name ILIKE '%Camavinga%' THEN 25
          WHEN p.name ILIKE '%Tchouameni%' OR p.name ILIKE '%chouam%' THEN 26
          WHEN p.name ILIKE '%Courtois%' THEN 27
          WHEN p.name ILIKE '%Saliba%' THEN 28
          WHEN p.name ILIKE '%Gabriel%' AND t.name ILIKE '%Arsenal%' THEN 29
          WHEN p.name ILIKE '%Rice%' AND t.name ILIKE '%Arsenal%' THEN 30
          WHEN p.name ILIKE '%Odegaard%' OR p.name ILIKE '%Ødegaard%' THEN 31
          WHEN p.name ILIKE '%Foden%' THEN 32
          WHEN p.name ILIKE '%Silva%' AND t.name ILIKE '%City%' THEN 33
          WHEN p.name ILIKE '%Alexander-Arnold%' OR p.name ILIKE '%Arnold%' THEN 34
          WHEN p.name ILIKE '%Dijk%' THEN 35
          WHEN p.name ILIKE '%Alisson%' THEN 36
          WHEN p.name ILIKE '%Palmer%' AND t.name ILIKE '%Chelsea%' THEN 37
          WHEN p.name ILIKE '%Son%' AND t.name ILIKE '%Tottenham%' THEN 38
          WHEN p.name ILIKE '%Bastoni%' THEN 39
          WHEN p.name ILIKE '%Calhanoglu%' OR p.name ILIKE '%Çalhanoğlu%' THEN 40
          WHEN p.name ILIKE '%Thuram%' AND t.name ILIKE '%Inter%' THEN 41
          WHEN p.name ILIKE '%Lookman%' THEN 42
          WHEN p.name ILIKE '%Dybala%' THEN 43
          WHEN p.name ILIKE '%Pulisic%' THEN 44
          WHEN p.name ILIKE '%Koopmeiners%' THEN 45
          WHEN p.name ILIKE '%Yildiz%' OR p.name ILIKE '%Yıldız%' THEN 46
          WHEN p.name ILIKE '%Douglas Luiz%' THEN 47
          WHEN p.name ILIKE '%Guirassy%' THEN 48
          WHEN p.name ILIKE '%Brandt%' THEN 49
          WHEN p.name ILIKE '%Adeyemi%' THEN 50
          WHEN p.name ILIKE '%Schlotterbeck%' THEN 51
          WHEN p.name ILIKE '%Kobel%' THEN 52
          WHEN p.name ILIKE '%Openda%' THEN 53
          WHEN p.name ILIKE '%Sesko%' OR p.name ILIKE '%Šeško%' THEN 54
          WHEN p.name ILIKE '%Simons%' AND t.name ILIKE '%Leipzig%' THEN 55
          WHEN p.name ILIKE '%Olise%' THEN 56
          WHEN p.name ILIKE '%Pavlovic%' OR p.name ILIKE '%Pavlović%' THEN 57
          WHEN p.name ILIKE '%Gnabry%' THEN 58
          WHEN p.name ILIKE '%Coman%' THEN 59
          WHEN p.name ILIKE '%Sane%' OR p.name ILIKE '%Sané%' THEN 60
          WHEN p.name ILIKE '%Palhinha%' THEN 61
          WHEN p.name ILIKE '%Donnarumma%' THEN 62
          WHEN p.name ILIKE '%Marquinhos%' THEN 63
          WHEN p.name ILIKE '%Vitinha%' AND t.name ILIKE '%Paris%' THEN 64
          WHEN p.name ILIKE '%Zaire-Emery%' OR p.name ILIKE '%Za%re%' THEN 65
          WHEN p.name ILIKE '%Neves%' AND t.name ILIKE '%Paris%' THEN 66
          WHEN p.name ILIKE '%Ruiz%' AND t.name ILIKE '%Paris%' THEN 67
          WHEN p.name ILIKE '%David%' AND t.name ILIKE '%Lille%' THEN 68
          WHEN p.name ILIKE '%Lacazette%' THEN 69
          WHEN p.name ILIKE '%Cherki%' THEN 70
          WHEN p.name ILIKE '%Greenwood%' THEN 71
          WHEN p.name ILIKE '%Hojbjerg%' OR p.name ILIKE '%Højbjerg%' THEN 72
          WHEN p.name ILIKE '%Griezmann%' THEN 73
          WHEN p.name ILIKE '%Alvarez%' AND t.name ILIKE '%Atletico%' THEN 74
          WHEN p.name ILIKE '%Oblak%' THEN 75
          WHEN p.name ILIKE '%Sorloth%' OR p.name ILIKE '%Sørloth%' THEN 76
          WHEN p.name ILIKE '%Williams%' AND t.name ILIKE '%Athletic%' THEN 77
          WHEN p.name ILIKE '%Sancet%' THEN 78
          WHEN p.name ILIKE '%Baena%' THEN 79
          WHEN p.name ILIKE '%Kubo%' THEN 80
          WHEN p.name ILIKE '%Oyarzabal%' THEN 81
          WHEN p.name ILIKE '%Zubimendi%' THEN 82
          WHEN p.name ILIKE '%Isco%' THEN 83
          WHEN p.name ILIKE '%Aspas%' THEN 84
          WHEN p.name ILIKE '%Isak%' THEN 85
          WHEN p.name ILIKE '%Gordon%' AND t.name ILIKE '%Newcastle%' THEN 86
          WHEN p.name ILIKE '%Guimaraes%' OR p.name ILIKE '%Guimarães%' THEN 87
          WHEN p.name ILIKE '%Watkins%' THEN 88
          WHEN p.name ILIKE '%Tielemans%' THEN 89
          WHEN p.name ILIKE '%Bowen%' THEN 90
          WHEN p.name ILIKE '%Kudus%' THEN 91
          WHEN p.name ILIKE '%Gibbs-White%' THEN 92
          WHEN p.name ILIKE '%Wood%' AND t.name ILIKE '%Forest%' THEN 93
          WHEN p.name ILIKE '%Cunha%' THEN 94
          WHEN p.name ILIKE '%Mbeumo%' THEN 95
          WHEN p.name ILIKE '%Wissa%' THEN 96
          WHEN p.name ILIKE '%Mitoma%' THEN 97
          WHEN p.name ILIKE '%Pedro%' AND t.name ILIKE '%Brighton%' THEN 98
          WHEN p.name ILIKE '%Solanke%' THEN 99
          WHEN p.name ILIKE '%Maddison%' THEN 100
          ELSE 999
        END as priority
      FROM players p
      JOIN teams t ON t.id = p.current_team_id
      JOIN competitions c ON t.country = c.country
      LEFT JOIN player_history_count phc ON phc.player_id = p.id
      WHERE p.external_id IS NOT NULL 
        AND p.external_provider = 'API_FOOTBALL'
        AND COALESCE(phc.hist_count, 0) <= 1
    )
    SELECT id, name, team_name, comp_name, external_id, current_team_id
    FROM candidates
    ORDER BY priority ASC, name ASC
    LIMIT $1;
  `, [maxToQuery]);

  const targetPlayers = playersRes.rows;
  console.log(`Selected ${targetPlayers.length} Top Stars for full career transfers sync.\n`);

  let totalTransfersProcessed = 0;
  let totalHistoryUpserted = 0;

  for (let idx = 0; idx < targetPlayers.length; idx++) {
    if (remainingToday <= SAFETY_RESERVE) {
      console.warn('\n⚠️ Quota limit safety threshold reached. Stopping gracefully.');
      break;
    }

    const player = targetPlayers[idx];
    process.stdout.write(`[${idx + 1}/${targetPlayers.length}] ${player.name} (${player.team_name}, ExtID: ${player.external_id}, Left: ${remainingToday})... `);

    try {
      const data = await callApi(`/transfers?player=${player.external_id}`);
      remainingToday--;

      const playerTransfersObj = data?.response?.[0];
      const transfersList: any[] = playerTransfersObj?.transfers || [];

      // Sort transfers chronologically by date ascending
      const sortedTransfers = [...transfersList].sort((a, b) => {
        if (!a.date) return -1;
        if (!b.date) return 1;
        return a.date.localeCompare(b.date);
      });

      let playerTransfersCount = 0;

      for (let tIdx = 0; tIdx < sortedTransfers.length; tIdx++) {
        const tr = sortedTransfers[tIdx];
        const trDate = tr.date || null;
        const inTeam = tr.teams?.in;
        const outTeam = tr.teams?.out;

        // 1. Process Out Team
        if (outTeam && outTeam.id && outTeam.name) {
          const outTeamExtId = String(outTeam.id);

          // Local
          const localOutRes = await LOCAL_CLIENT.query(`
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `, [outTeamExtId, outTeam.name, outTeam.logo || null]);
          const localOutTeamId = localOutRes.rows[0].id;

          // Supabase
          const supaOutRes = await SUPABASE_CLIENT.query(`
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `, [outTeamExtId, outTeam.name, outTeam.logo || null]);
          const supaOutTeamId = supaOutRes.rows[0].id;

          // History entry local
          await LOCAL_CLIENT.query(`
            INSERT INTO player_team_history (player_id, team_id, end_date, is_current)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = false;
          `, [player.id, localOutTeamId, trDate]);

          // History entry Supabase
          await SUPABASE_CLIENT.query(`
            INSERT INTO player_team_history (player_id, team_id, end_date, is_current)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = false;
          `, [player.id, supaOutTeamId, trDate]);

          playerTransfersCount++;
          totalHistoryUpserted++;
        }

        // 2. Process In Team
        if (inTeam && inTeam.id && inTeam.name) {
          const inTeamExtId = String(inTeam.id);

          // Local
          const localInRes = await LOCAL_CLIENT.query(`
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `, [inTeamExtId, inTeam.name, inTeam.logo || null]);
          const localInTeamId = localInRes.rows[0].id;

          // Supabase
          const supaInRes = await SUPABASE_CLIENT.query(`
            INSERT INTO teams (external_provider, external_id, name, short_name, logo_url, data_updated_at)
            VALUES ('API_FOOTBALL', $1, $2, $2, $3, NOW())
            ON CONFLICT (external_provider, external_id) DO UPDATE
            SET name = $2, logo_url = COALESCE(teams.logo_url, $3)
            RETURNING id;
          `, [inTeamExtId, inTeam.name, inTeam.logo || null]);
          const supaInTeamId = supaInRes.rows[0].id;

          const isCurrent = localInTeamId === player.current_team_id || supaInTeamId === player.current_team_id;
          let nextEndDate: string | null = null;
          if (tIdx < sortedTransfers.length - 1 && !isCurrent) {
            nextEndDate = sortedTransfers[tIdx + 1]?.date || null;
          }

          // History entry local
          await LOCAL_CLIENT.query(`
            INSERT INTO player_team_history (player_id, team_id, start_date, end_date, is_current)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = EXCLUDED.is_current;
          `, [player.id, localInTeamId, trDate, nextEndDate, isCurrent]);

          // History entry Supabase
          await SUPABASE_CLIENT.query(`
            INSERT INTO player_team_history (player_id, team_id, start_date, end_date, is_current)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (player_id, team_id, COALESCE(start_date, '1900-01-01'::date))
            DO UPDATE SET end_date = COALESCE(EXCLUDED.end_date, player_team_history.end_date), is_current = EXCLUDED.is_current;
          `, [player.id, supaInTeamId, trDate, nextEndDate, isCurrent]);

          playerTransfersCount++;
          totalHistoryUpserted++;
        }

        totalTransfersProcessed++;
      }

      console.log(`✓ Synced ${playerTransfersCount} club moves (${transfersList.length} API transfer events).`);
    } catch (err: any) {
      console.warn(`❌ Failed for ${player.name}: ${err.message}`);
    }

    if (idx < targetPlayers.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n======================================================================');
  console.log(`🎉 PHASE 2 COMPLETE!`);
  console.log(`  Total career moves upserted: ${totalHistoryUpserted}`);
  console.log(`  Remaining daily API quota: ${remainingToday}`);
  console.log('======================================================================\n');

  await LOCAL_CLIENT.end();
  await SUPABASE_CLIENT.end();
}

main().catch((err) => {
  console.error('Fatal transfer sync error:', err);
  process.exit(1);
});
