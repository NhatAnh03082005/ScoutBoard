import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';
import { Client } from 'pg';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiFootballPlayerMatchStatisticMapper } from '../modules/external-football/infrastructure/mappers/api-football-player-match-statistic.mapper';
import { PlayerSeasonStatisticsAggregationService } from '../modules/players/application/services/player-season-statistics-aggregation.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7';
const BASE_HOST = 'v3.football.api-sports.io';
const DELAY_MS = 6200; // Strictly adhere to <= 10 requests per minute
const SAFETY_RESERVE = 2; // Always keep >= 2 requests in reserve

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TARGET_LEAGUES = [
  {
    name: 'Bundesliga',
    leagueExternalId: 78,
    competitionId: '3287afe2-608a-413c-a0b9-3f6b467586c4',
    seasonId: '2142003f-889e-4119-955e-0876d4bfca8c',
    bigClubExtIds: ['157', '165', '168', '173', '169', '172'], // Bayern, Dortmund, Leverkusen, Leipzig, Frankfurt, Stuttgart
    targetStatsCount: 27,
  },
  {
    name: 'Serie A',
    leagueExternalId: 135,
    competitionId: 'aa209d46-caf3-40ea-ac88-fd516bb0dc18',
    seasonId: 'aa1f68b7-4c78-428d-b8d9-19e33b86611d',
    bigClubExtIds: ['505', '489', '496', '492', '497', '499', '487'], // Inter, Milan, Juventus, Napoli, Roma, Atalanta, Lazio
    targetStatsCount: 27,
  },
  {
    name: 'Ligue 1',
    leagueExternalId: 61,
    competitionId: '974a6b13-5e12-4508-b45a-ac71a1098120',
    seasonId: 'd9c9b68b-2b3d-4a64-8ce3-3a1f2648a71f',
    bigClubExtIds: ['85', '81', '91', '80', '79'], // PSG, Marseille, Monaco, Lyon, Lille
    targetStatsCount: 27,
  },
];

function mapMatchStatus(apiStatus?: string): string {
  if (!apiStatus) return 'SCHEDULED';
  const s = apiStatus.toUpperCase().trim();
  switch (s) {
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'FINISHED';
    case '1H':
    case 'HT':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'IN_PLAY';
    case 'PST':
    case 'CANC':
    case 'ABD':
    case 'AWD':
    case 'WO':
      return 'POSTPONED';
    case 'NS':
    case 'TBD':
    default:
      return 'SCHEDULED';
  }
}

function callApi(endpoint: string, queryParams?: Record<string, any>): Promise<any> {
  let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (queryParams) {
    const qs = Object.entries(queryParams)
      .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) cleanPath += `?${qs}`;
  }

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
        timeout: 25000,
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

async function getQuota(): Promise<{ current: number; limit: number; remaining: number }> {
  try {
    const res: any = await callApi('/status');
    const current = res?.response?.requests?.current ?? 0;
    const limit = res?.response?.requests?.limit_day ?? 100;
    return { current, limit, remaining: Math.max(0, limit - current) };
  } catch (err: any) {
    return { current: 100, limit: 100, remaining: 0 };
  }
}

async function main() {
  console.log('======================================================================');
  console.log('=== SYNC MATCH FIXTURES & STATS: BUNDESLIGA, SERIE A, LIGUE 1      ===');
  console.log('=== DUAL SYNC: LOCAL DB + SUPABASE CLOUD POOLER                   ===');
  console.log('======================================================================\n');

  // 1. Initialize NestJS application context (for season aggregation)
  console.log('>>> Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const seasonAggService = app.get(PlayerSeasonStatisticsAggregationService);

  // 2. Initialize Dual Database Clients
  const localClient = new Client({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres123',
    database: process.env.POSTGRES_DB || 'scoutboard_db',
  });

  const supabaseClient = new Client({
    host: process.env.SUPABASE_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.SUPABASE_PORT || '6543', 10),
    user: process.env.SUPABASE_USER || 'postgres.utpuxqpokpqnxpqqiens',
    password: process.env.SUPABASE_PASSWORD || '03082005Anhle@@',
    database: process.env.SUPABASE_DB || 'postgres',
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60000,
  });

  await localClient.connect();
  await supabaseClient.connect();
  console.log('✓ Connected to Local PostgreSQL and Supabase Cloud.');

  // 3. Check Initial Quota
  const initialQuota = await getQuota();
  console.log(
    `[API-Football Quota] Current: ${initialQuota.current}/${initialQuota.limit} | Remaining: ${initialQuota.remaining}\n`,
  );

  if (initialQuota.remaining <= SAFETY_RESERVE) {
    console.error('❌ Daily quota exhausted or too low. Halting execution.');
    await localClient.end();
    await supabaseClient.end();
    await app.close();
    return;
  }

  // Pre-load team mappings (external_id -> id) from DB
  const teamRes = await localClient.query(`
    SELECT id, external_id, name, country FROM teams WHERE external_provider = 'API_FOOTBALL';
  `);
  const teamMap = new Map<string, string>();
  teamRes.rows.forEach((t) => {
    teamMap.set(String(t.external_id), t.id);
  });
  console.log(`Loaded ${teamMap.size} club external IDs for ID resolution.`);

  // Pre-load player mappings (external_id -> id) from DB
  const playerRes = await localClient.query(`
    SELECT id, external_id, name FROM players WHERE external_provider = 'API_FOOTBALL';
  `);
  const playerMap = new Map<string, string>();
  playerRes.rows.forEach((p) => {
    playerMap.set(String(p.external_id), p.id);
  });
  console.log(`Loaded ${playerMap.size} player external IDs for stats resolution.\n`);

  // =========================================================================
  // STAGE 1: Verify / Fetch Full Season Fixtures for Bundesliga, Serie A, Ligue 1
  // =========================================================================
  console.log('======================================================================');
  console.log('=== STAGE 1: VERIFYING FULL FIXTURES FOR 3 LEAGUES                 ===');
  console.log('======================================================================');

  let totalFixturesSynced = 0;

  for (let lIdx = 0; lIdx < TARGET_LEAGUES.length; lIdx++) {
    const league = TARGET_LEAGUES[lIdx];
    console.log(
      `\n[${lIdx + 1}/3] Checking 2024 season fixtures for ${league.name} (API ID: ${league.leagueExternalId})...`,
    );

    const existingCountRes = await localClient.query(
      `SELECT count(*) FROM matches WHERE competition_id = $1 AND season_id = $2`,
      [league.competitionId, league.seasonId],
    );
    const existingCount = parseInt(existingCountRes.rows[0].count, 10);
    if (existingCount >= 300) {
      console.log(`  ✓ ${league.name} already has ${existingCount} fixtures in database. Skipping fixture API fetch.`);
      totalFixturesSynced += existingCount;
      continue;
    }

    const res = await callApi('/fixtures', {
      league: league.leagueExternalId,
      season: 2024,
    });
    const fixtures = res?.response || [];
    console.log(`  Received ${fixtures.length} fixtures from API-Football for ${league.name}.`);

    const chunkSize = 100;
    for (let i = 0; i < fixtures.length; i += chunkSize) {
      const chunk = fixtures.slice(i, i + chunkSize);
      for (const f of chunk) {
        const fixtureExtId = String(f.fixture.id);
        const homeExtId = String(f.teams.home.id);
        const awayExtId = String(f.teams.away.id);

        let homeTeamId = teamMap.get(homeExtId);
        let awayTeamId = teamMap.get(awayExtId);

        if (!homeTeamId) {
          const newTeamId = crypto.randomUUID();
          const teamName = f.teams.home.name || `Club ${homeExtId}`;
          const cName = league.name === 'Bundesliga' ? 'Germany' : league.name === 'Serie A' ? 'Italy' : 'France';
          await localClient.query(
            `INSERT INTO teams (id, external_provider, external_id, name, country, created_at, updated_at)
             VALUES ($1, 'API_FOOTBALL', $2, $3, $4, NOW(), NOW())
             ON CONFLICT (external_provider, external_id) DO UPDATE SET updated_at = NOW()`,
            [newTeamId, homeExtId, teamName, cName],
          );
          await supabaseClient.query(
            `INSERT INTO teams (id, external_provider, external_id, name, country, created_at, updated_at)
             VALUES ($1, 'API_FOOTBALL', $2, $3, $4, NOW(), NOW())
             ON CONFLICT (external_provider, external_id) DO UPDATE SET updated_at = NOW()`,
            [newTeamId, homeExtId, teamName, cName],
          );
          teamMap.set(homeExtId, newTeamId);
          homeTeamId = newTeamId;
        }

        if (!awayTeamId) {
          const newTeamId = crypto.randomUUID();
          const teamName = f.teams.away.name || `Club ${awayExtId}`;
          const cName = league.name === 'Bundesliga' ? 'Germany' : league.name === 'Serie A' ? 'Italy' : 'France';
          await localClient.query(
            `INSERT INTO teams (id, external_provider, external_id, name, country, created_at, updated_at)
             VALUES ($1, 'API_FOOTBALL', $2, $3, $4, NOW(), NOW())
             ON CONFLICT (external_provider, external_id) DO UPDATE SET updated_at = NOW()`,
            [newTeamId, awayExtId, teamName, cName],
          );
          await supabaseClient.query(
            `INSERT INTO teams (id, external_provider, external_id, name, country, created_at, updated_at)
             VALUES ($1, 'API_FOOTBALL', $2, $3, $4, NOW(), NOW())
             ON CONFLICT (external_provider, external_id) DO UPDATE SET updated_at = NOW()`,
            [newTeamId, awayExtId, teamName, cName],
          );
          teamMap.set(awayExtId, newTeamId);
          awayTeamId = newTeamId;
        }

        const matchDate = f.fixture.date ? new Date(f.fixture.date) : null;
        const status = mapMatchStatus(f.fixture.status?.short);
        const homeScore = f.goals?.home ?? null;
        const awayScore = f.goals?.away ?? null;

        const existingRes = await localClient.query(
          `SELECT id FROM matches WHERE external_provider = 'API_FOOTBALL' AND external_id = $1`,
          [fixtureExtId],
        );
        const matchId = existingRes.rows.length > 0 ? existingRes.rows[0].id : crypto.randomUUID();

        await localClient.query(
          `INSERT INTO matches (
            id, competition_id, season_id, home_team_id, away_team_id,
            external_provider, external_id, match_date, status, home_score,
            away_score, data_updated_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'API_FOOTBALL', $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
          ON CONFLICT (external_provider, external_id) DO UPDATE SET
            competition_id = EXCLUDED.competition_id,
            season_id = EXCLUDED.season_id,
            home_team_id = EXCLUDED.home_team_id,
            away_team_id = EXCLUDED.away_team_id,
            match_date = EXCLUDED.match_date,
            status = EXCLUDED.status,
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            data_updated_at = NOW(),
            updated_at = NOW()`,
          [matchId, league.competitionId, league.seasonId, homeTeamId, awayTeamId, fixtureExtId, matchDate, status, homeScore, awayScore],
        );

        await supabaseClient.query(
          `INSERT INTO matches (
            id, competition_id, season_id, home_team_id, away_team_id,
            external_provider, external_id, match_date, status, home_score,
            away_score, data_updated_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'API_FOOTBALL', $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
          ON CONFLICT (external_provider, external_id) DO UPDATE SET
            competition_id = EXCLUDED.competition_id,
            season_id = EXCLUDED.season_id,
            home_team_id = EXCLUDED.home_team_id,
            away_team_id = EXCLUDED.away_team_id,
            match_date = EXCLUDED.match_date,
            status = EXCLUDED.status,
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            data_updated_at = NOW(),
            updated_at = NOW()`,
          [matchId, league.competitionId, league.seasonId, homeTeamId, awayTeamId, fixtureExtId, matchDate, status, homeScore, awayScore],
        );
      }
    }

    console.log(`  ✓ Successfully synced ${fixtures.length} fixtures for ${league.name}.`);
    totalFixturesSynced += fixtures.length;
    await sleep(DELAY_MS);
  }

  console.log(`\n✓ STAGE 1 VERIFIED: Total ${totalFixturesSynced} fixtures ready in database.\n`);

  // =========================================================================
  // STAGE 2: Select Top Finished Matches across Bundesliga, Serie A, Ligue 1
  // =========================================================================
  console.log('======================================================================');
  console.log('=== STAGE 2: SELECTING TOP FINISHED MATCHES FOR PERFORMANCE STATS  ===');
  console.log('======================================================================');

  const selectedMatches: Array<{
    id: string;
    external_id: string;
    match_date: string;
    home: string;
    away: string;
    league_name: string;
    season_id: string;
    competition_id: string;
  }> = [];

  for (const league of TARGET_LEAGUES) {
    const candidates = await localClient.query(
      `
      SELECT m.id, m.external_id, m.match_date, ht.name as home, at.name as away,
             ht.external_id as home_ext, at.external_id as away_ext,
             m.season_id, m.competition_id, $1 as league_name
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.competition_id = $2
        AND m.season_id = $3
        AND m.status = 'FINISHED'
        AND NOT EXISTS (
          SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id
        )
      ORDER BY
        CASE
          WHEN (ht.external_id = ANY($4::text[]) AND at.external_id = ANY($4::text[])) THEN 1
          WHEN (ht.external_id = ANY($4::text[]) OR at.external_id = ANY($4::text[])) THEN 2
          ELSE 3
        END ASC,
        m.match_date DESC
      LIMIT $5
    `,
      [league.name, league.competitionId, league.seasonId, league.bigClubExtIds, league.targetStatsCount],
    );

    console.log(`Found ${candidates.rows.length} pending priority matches for ${league.name}.`);
    candidates.rows.forEach((r) => selectedMatches.push(r));
  }

  console.log(`\nTotal candidate matches selected for stat retrieval: ${selectedMatches.length}`);

  const quotaBeforeStats = await getQuota();
  console.log(
    `[API-Football Quota] Current: ${quotaBeforeStats.current}/${quotaBeforeStats.limit} | Remaining: ${quotaBeforeStats.remaining}`,
  );

  const statsBudget = Math.min(
    selectedMatches.length,
    Math.max(0, quotaBeforeStats.remaining - SAFETY_RESERVE),
  );
  console.log(`Plan to sync detailed player stats for ${statsBudget} matches.\n`);

  if (statsBudget <= 0) {
    console.warn('⚠️ No quota left for match stats. Proceeding to aggregation.');
  }

  // =========================================================================
  // STAGE 3: Fetch & Persist Detailed Match Player Performance Stats
  // =========================================================================
  let statsSuccess = 0;
  let totalPlayersPersisted = 0;

  for (let i = 0; i < statsBudget; i++) {
    const match = selectedMatches[i];
    const matchNum = i + 1;
    const dateStr = match.match_date ? new Date(match.match_date).toISOString().slice(0, 10) : 'N/A';

    process.stdout.write(
      `[${matchNum}/${statsBudget}] [${match.league_name}] Fixture ${match.external_id} (${match.home} vs ${match.away}, ${dateStr})... `,
    );

    try {
      const res = await callApi('/fixtures/players', {
        fixture: match.external_id,
      });

      const teamResponses = res?.response || [];
      let matchPlayersPersisted = 0;

      for (const teamItem of teamResponses) {
        const teamExtId = String(teamItem.team.id);
        const teamInternalId = teamMap.get(teamExtId);

        if (!teamInternalId) continue;

        for (const p of teamItem.players || []) {
          const playerExtId = String(p.player.id);
          const playerInternalId = playerMap.get(playerExtId);

          if (!playerInternalId) continue;

          const transformed = ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
            p,
            teamExtId,
            match.external_id,
          );

          const statId = crypto.randomUUID();
          const ratingVal = transformed.rating !== null && !isNaN(transformed.rating) ? transformed.rating : null;
          const statsJson = JSON.stringify(transformed.extendedStatistics || {});

          const params = [
            statId,
            match.id,
            playerInternalId,
            teamInternalId,
            transformed.minutesPlayed ?? 0,
            transformed.isStarter ?? false,
            ratingVal,
            transformed.goals ?? 0,
            transformed.assists ?? 0,
            transformed.shots ?? 0,
            transformed.keyPasses ?? 0,
            transformed.passesAttempted ?? 0,
            transformed.passesCompleted ?? 0,
            transformed.tackles ?? 0,
            transformed.interceptions ?? 0,
            transformed.yellowCards ?? 0,
            transformed.redCards ?? 0,
            transformed.saves,
            transformed.goalsConceded,
            transformed.cleanSheets,
            transformed.penaltiesSaved,
            statsJson,
          ];

          const query = `
            INSERT INTO player_match_statistics (
              id, match_id, player_id, team_id,
              minutes_played, is_starter, rating, goals, assists, shots,
              key_passes, passes_attempted, passes_completed, tackles, interceptions,
              yellow_cards, red_cards, saves, goals_conceded, clean_sheets, penalties_saved,
              statistics, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21,
              $22, NOW(), NOW()
            )
            ON CONFLICT (match_id, player_id) DO UPDATE SET
              team_id = EXCLUDED.team_id,
              minutes_played = EXCLUDED.minutes_played,
              is_starter = EXCLUDED.is_starter,
              rating = EXCLUDED.rating,
              goals = EXCLUDED.goals,
              assists = EXCLUDED.assists,
              shots = EXCLUDED.shots,
              key_passes = EXCLUDED.key_passes,
              passes_attempted = EXCLUDED.passes_attempted,
              passes_completed = EXCLUDED.passes_completed,
              tackles = EXCLUDED.tackles,
              interceptions = EXCLUDED.interceptions,
              yellow_cards = EXCLUDED.yellow_cards,
              red_cards = EXCLUDED.red_cards,
              saves = EXCLUDED.saves,
              goals_conceded = EXCLUDED.goals_conceded,
              clean_sheets = EXCLUDED.clean_sheets,
              penalties_saved = EXCLUDED.penalties_saved,
              statistics = EXCLUDED.statistics,
              updated_at = NOW()
          `;

          await localClient.query(query, params);
          await supabaseClient.query(query, params);

          matchPlayersPersisted++;
        }
      }

      statsSuccess++;
      totalPlayersPersisted += matchPlayersPersisted;
      console.log(`✓ OK (${matchPlayersPersisted} player stats persisted)`);
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
      if (
        err.message &&
        (err.message.includes('rate') ||
          err.message.includes('limit') ||
          err.message.includes('requests'))
      ) {
        console.warn('⚠️ Quota limit detected. Stopping match loop.');
        break;
      }
    }

    if (i < statsBudget - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `\n✓ STAGE 3 COMPLETE: ${statsSuccess}/${statsBudget} matches processed. ${totalPlayersPersisted} player match performance records persisted.\n`,
  );

  // =========================================================================
  // STAGE 4: Aggregate Season Statistics & Push to Supabase Cloud (0 Requests)
  // =========================================================================
  console.log('======================================================================');
  console.log('=== STAGE 4: AGGREGATING SEASON STATISTICS & BENCHMARKS (0 REQS)  ===');
  console.log('======================================================================');

  for (const league of TARGET_LEAGUES) {
    console.log(`\nAggregating season stats for ${league.name} 2024-2025...`);
    try {
      const aggResult = await seasonAggService.aggregateAllForSeason(
        league.seasonId,
        league.competitionId,
      );
      console.log(
        `✓ ${league.name}: Aggregated ${aggResult.totalAggregated} player season statistics on Local DB.`,
      );
    } catch (e: any) {
      console.error(`⚠️ Aggregation error for ${league.name}:`, e.message);
    }
  }

  console.log('\nSynchronizing updated player_season_statistics to Supabase Cloud...');
  const compIds = TARGET_LEAGUES.map((l) => l.competitionId);

  const localSeasonStats = await localClient.query(
    `
    SELECT *
    FROM player_season_statistics
    WHERE competition_id = ANY($1::uuid[])
  `,
    [compIds],
  );

  console.log(`Found ${localSeasonStats.rows.length} season stats records to push to Cloud.`);

  let pushedSeasonStats = 0;
  for (const s of localSeasonStats.rows) {
    await supabaseClient.query(
      `
      INSERT INTO player_season_statistics (
        id, player_id, season_id, competition_id, team_id,
        matches_played, starts, minutes_played, goals, assists,
        shots, shots_on_target, key_passes, passes_attempted, passes_completed,
        tackles, interceptions, yellow_cards, red_cards, duels_won,
        advanced_statistics, goals_per_90, assists_per_90, key_passes_per_90,
        tackles_per_90, interceptions_per_90, saves, goals_conceded,
        clean_sheets, penalties_saved, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, $26, $27, $28,
        $29, $30, NOW(), NOW()
      )
      ON CONFLICT (player_id, season_id, competition_id, team_id) DO UPDATE SET
        matches_played = EXCLUDED.matches_played,
        starts = EXCLUDED.starts,
        minutes_played = EXCLUDED.minutes_played,
        goals = EXCLUDED.goals,
        assists = EXCLUDED.assists,
        shots = EXCLUDED.shots,
        shots_on_target = EXCLUDED.shots_on_target,
        key_passes = EXCLUDED.key_passes,
        passes_attempted = EXCLUDED.passes_attempted,
        passes_completed = EXCLUDED.passes_completed,
        tackles = EXCLUDED.tackles,
        interceptions = EXCLUDED.interceptions,
        yellow_cards = EXCLUDED.yellow_cards,
        red_cards = EXCLUDED.red_cards,
        duels_won = EXCLUDED.duels_won,
        advanced_statistics = EXCLUDED.advanced_statistics,
        goals_per_90 = EXCLUDED.goals_per_90,
        assists_per_90 = EXCLUDED.assists_per_90,
        key_passes_per_90 = EXCLUDED.key_passes_per_90,
        tackles_per_90 = EXCLUDED.tackles_per_90,
        interceptions_per_90 = EXCLUDED.interceptions_per_90,
        saves = EXCLUDED.saves,
        goals_conceded = EXCLUDED.goals_conceded,
        clean_sheets = EXCLUDED.clean_sheets,
        penalties_saved = EXCLUDED.penalties_saved,
        updated_at = NOW()
    `,
      [
        s.id,
        s.player_id,
        s.season_id,
        s.competition_id,
        s.team_id,
        s.matches_played,
        s.starts,
        s.minutes_played,
        s.goals,
        s.assists,
        s.shots,
        s.shots_on_target,
        s.key_passes,
        s.passes_attempted,
        s.passes_completed,
        s.tackles,
        s.interceptions,
        s.yellow_cards,
        s.red_cards,
        s.duels_won,
        s.advanced_statistics ? JSON.stringify(s.advanced_statistics) : null,
        s.goals_per_90,
        s.assists_per_90,
        s.key_passes_per_90,
        s.tackles_per_90,
        s.interceptions_per_90,
        s.saves,
        s.goals_conceded,
        s.clean_sheets,
        s.penalties_saved,
      ],
    );
    pushedSeasonStats++;
  }
  console.log(`✓ Pushed ${pushedSeasonStats} season statistics to Supabase Cloud.`);

  // =========================================================================
  // STAGE 5: Final Audit & Quota Verification
  // =========================================================================
  console.log('\n======================================================================');
  console.log('=== STAGE 5: FINAL AUDIT AND HEALTH CHECK                          ===');
  console.log('======================================================================');

  const localCounts = await localClient.query(`
    SELECT
      (SELECT count(*) FROM matches WHERE competition_id = ANY($1::uuid[])) as matches_top3,
      (SELECT count(*) FROM player_match_statistics pms JOIN matches m ON pms.match_id = m.id WHERE m.competition_id = ANY($1::uuid[])) as match_stats_top3,
      (SELECT count(*) FROM player_season_statistics WHERE competition_id = ANY($1::uuid[])) as season_stats_top3
  `, [compIds]);

  const supaCounts = await supabaseClient.query(`
    SELECT
      (SELECT count(*) FROM matches WHERE competition_id = ANY($1::uuid[])) as matches_top3,
      (SELECT count(*) FROM player_match_statistics pms JOIN matches m ON pms.match_id = m.id WHERE m.competition_id = ANY($1::uuid[])) as match_stats_top3,
      (SELECT count(*) FROM player_season_statistics WHERE competition_id = ANY($1::uuid[])) as season_stats_top3
  `, [compIds]);

  console.log('\n[Database Parity Audit for Bundesliga, Serie A, Ligue 1]:');
  console.table([
    { Database: 'Local PostgreSQL', ...localCounts.rows[0] },
    { Database: 'Supabase Cloud', ...supaCounts.rows[0] },
  ]);

  const finalQuota = await getQuota();
  console.log(
    `\n[Final API Quota]: Used ${finalQuota.current}/${finalQuota.limit} requests today | Remaining: ${finalQuota.remaining}`,
  );
  console.log('======================================================================\n');

  await localClient.end();
  await supabaseClient.end();
  await app.close();
}

main().catch((err) => {
  console.error('Fatal error in sync-top3-leagues-matches-and-stats:', err);
  process.exit(1);
});
