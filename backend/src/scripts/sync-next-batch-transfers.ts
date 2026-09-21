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
const TARGET_PLAYERS_COUNT = 96; // Up to 96 players

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
  console.log('=== SCOUTBOARD: SYNC CAREER TRANSFERS BATCH 3 (96 STAR PLAYERS)    ===');
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
          -- Bayer Leverkusen stars
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Wirtz%' THEN 1
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Frimpong%' THEN 2
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Grimaldo%' THEN 3
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Xhaka%' THEN 4
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Boniface%' THEN 5
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Tah%' THEN 6
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Tapsoba%' THEN 7
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Hincapi%' THEN 8
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Schick%' THEN 9
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Hofmann%' THEN 10
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Andrich%' THEN 11
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Palacios%' THEN 12
          WHEN t.name ILIKE '%Leverkusen%' AND p.name ILIKE '%Garcia%' THEN 13

          -- Eintracht Frankfurt stars
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Marmoush%' THEN 14
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Ekitik%' THEN 15
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Gotze%' OR p.name ILIKE '%Götze%' THEN 16
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Trapp%' THEN 17
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Theate%' THEN 18
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Koch%' THEN 19
          WHEN t.name ILIKE '%Frankfurt%' AND p.name ILIKE '%Larsson%' THEN 20

          -- Hoffenheim & Bundesliga stars
          WHEN t.name ILIKE '%Hoffenheim%' AND p.name ILIKE '%Kramari%' THEN 21
          WHEN t.name ILIKE '%Hoffenheim%' AND p.name ILIKE '%Hlozek%' OR p.name ILIKE '%Hložek%' THEN 22
          WHEN t.name ILIKE '%Hoffenheim%' AND p.name ILIKE '%Baumann%' THEN 23
          WHEN t.name ILIKE '%Hoffenheim%' AND p.name ILIKE '%Prass%' THEN 24

          -- Top European stars
          WHEN p.name ILIKE '%Bernardo Silva%' THEN 25
          WHEN p.name ILIKE '%Timber%' AND t.name ILIKE '%Arsenal%' THEN 26
          WHEN p.name ILIKE '%Chukwueze%' THEN 27
          WHEN p.name ILIKE '%Di Lorenzo%' THEN 28
          WHEN p.name ILIKE '%David Neres%' THEN 29
          WHEN p.name ILIKE '%Gavi%' THEN 30
          WHEN p.name ILIKE '%Ederson%' AND t.name ILIKE '%Atalanta%' THEN 31
          WHEN p.name ILIKE '%Evanilson%' THEN 32
          WHEN p.name ILIKE '%Tapsoba%' THEN 33
          WHEN p.name ILIKE '%Rensch%' THEN 34
          WHEN p.name ILIKE '%Gabbia%' THEN 35
          WHEN p.name ILIKE '%Morata%' THEN 36
          WHEN p.name ILIKE '%Abraham%' THEN 37
          WHEN p.name ILIKE '%Jovic%' OR p.name ILIKE '%Jović%' THEN 38
          WHEN p.name ILIKE '%Okafor%' THEN 39
          WHEN p.name ILIKE '%Musah%' THEN 40
          WHEN p.name ILIKE '%Fofana%' AND t.name ILIKE '%Milan%' THEN 41
          WHEN p.name ILIKE '%Bennacer%' THEN 42
          WHEN p.name ILIKE '%Reijnders%' THEN 43
          WHEN p.name ILIKE '%Loftus-Cheek%' THEN 44
          WHEN p.name ILIKE '%Tomori%' THEN 45
          WHEN p.name ILIKE '%Thiaw%' THEN 46
          WHEN p.name ILIKE '%Emerson Royal%' THEN 47
          WHEN p.name ILIKE '%Calabria%' THEN 48

          -- Inter & Juventus stars
          WHEN p.name ILIKE '%Bisseck%' THEN 49
          WHEN p.name ILIKE '%Zielinski%' OR p.name ILIKE '%Zieliński%' THEN 50
          WHEN p.name ILIKE '%Taremi%' THEN 51
          WHEN p.name ILIKE '%Arnautovic%' OR p.name ILIKE '%Arnautović%' THEN 52
          WHEN p.name ILIKE '%Carlos Augusto%' THEN 53
          WHEN p.name ILIKE '%Darmian%' THEN 54
          WHEN p.name ILIKE '%Acerbi%' THEN 55
          WHEN p.name ILIKE '%Sommer%' THEN 56
          WHEN p.name ILIKE '%Di Gregorio%' THEN 57
          WHEN p.name ILIKE '%Douglas Luiz%' THEN 58
          WHEN p.name ILIKE '%Thuram%' AND t.name ILIKE '%Juventus%' THEN 59
          WHEN p.name ILIKE '%Conceicao%' OR p.name ILIKE '%Conceição%' THEN 60
          WHEN p.name ILIKE '%Nico Gonzalez%' OR p.name ILIKE '%Nicolás González%' THEN 61
          WHEN p.name ILIKE '%Locatelli%' THEN 62
          WHEN p.name ILIKE '%Gatti%' THEN 63
          WHEN p.name ILIKE '%Kalulu%' THEN 64
          WHEN p.name ILIKE '%McKennie%' THEN 65
          WHEN p.name ILIKE '%Weah%' THEN 66

          -- Roma & Napoli & Atalanta stars
          WHEN p.name ILIKE '%Pellegrini%' AND t.name ILIKE '%Roma%' THEN 67
          WHEN p.name ILIKE '%Cristante%' THEN 68
          WHEN p.name ILIKE '%Mancini%' AND t.name ILIKE '%Roma%' THEN 69
          WHEN p.name ILIKE '%Soulé%' OR p.name ILIKE '%Soule%' THEN 70
          WHEN p.name ILIKE '%Dovbyk%' THEN 71
          WHEN p.name ILIKE '%Zambo Anguissa%' OR p.name ILIKE '%Anguissa%' THEN 72
          WHEN p.name ILIKE '%Politano%' THEN 73
          WHEN p.name ILIKE '%Raspadori%' THEN 74
          WHEN p.name ILIKE '%Simeone%' AND t.name ILIKE '%Napoli%' THEN 75
          WHEN p.name ILIKE '%Spinazzola%' THEN 76
          WHEN p.name ILIKE '%Buongiorno%' THEN 77
          WHEN p.name ILIKE '%Retegui%' THEN 78
          WHEN p.name ILIKE '%De Ketelaere%' THEN 79
          WHEN p.name ILIKE '%Scamacca%' THEN 80
          WHEN p.name ILIKE '%Pasalic%' OR p.name ILIKE '%Pašalić%' THEN 81
          WHEN p.name ILIKE '%Kolasinac%' OR p.name ILIKE '%Kolašinac%' THEN 82
          WHEN p.name ILIKE '%Zappacosta%' THEN 83

          -- PSG & Ligue 1 stars
          WHEN p.name ILIKE '%Marquinhos%' THEN 84
          WHEN p.name ILIKE '%Beraldo%' THEN 85
          WHEN p.name ILIKE '%Lucas Hernandez%' OR (p.name ILIKE '%Hernandez%' AND t.name ILIKE '%Paris%') THEN 86
          WHEN p.name ILIKE '%Skriniar%' OR p.name ILIKE '%Škriniar%' THEN 87
          WHEN p.name ILIKE '%Kimpembe%' THEN 88
          WHEN p.name ILIKE '%Donnarumma%' THEN 89
          WHEN p.name ILIKE '%Safonov%' THEN 90
          WHEN p.name ILIKE '%Ramos%' AND t.name ILIKE '%Paris%' THEN 91
          WHEN p.name ILIKE '%Asensio%' THEN 92
          WHEN p.name ILIKE '%Lee Kang-in%' OR p.name ILIKE '%Kang-in Lee%' OR p.name ILIKE '%Kang-In%' THEN 93

          -- Premier League & La Liga notables
          WHEN p.name ILIKE '%Calafiori%' THEN 94
          WHEN p.name ILIKE '%Merino%' AND t.name ILIKE '%Arsenal%' THEN 95
          WHEN p.name ILIKE '%Sterling%' AND t.name ILIKE '%Arsenal%' THEN 96
          WHEN p.name ILIKE '%Trossard%' THEN 97
          WHEN p.name ILIKE '%Jorginho%' THEN 98
          WHEN p.name ILIKE '%Zinchenko%' THEN 99
          WHEN p.name ILIKE '%Partey%' THEN 100
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

      console.log(`✓ Synced ${playerTransfersCount} club moves (${transfersList.length} API events).`);
    } catch (err: any) {
      console.warn(`❌ Failed for ${player.name}: ${err.message}`);
    }

    if (idx < targetPlayers.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n======================================================================');
  console.log(`🎉 BATCH 3 COMPLETE!`);
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
