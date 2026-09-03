/**
 * DB Audit Script — Verify sync state after backfill
 * Run: node scripts/db-audit.js
 */
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres123',
  database: 'scoutboard_db',
});

async function audit() {
  await client.connect();
  console.log('\n========================================');
  console.log('  ScoutBoard DB State Audit');
  console.log('========================================\n');

  // 1. Matches per competition/season
  const matchesRes = await client.query(`
    SELECT 
      c.name AS competition,
      s.season_code AS season,
      COUNT(m.id)::int AS total_matches,
      COUNT(CASE WHEN m.status = 'FINISHED' THEN 1 END)::int AS finished,
      COUNT(CASE WHEN m.status = 'SCHEDULED' THEN 1 END)::int AS scheduled
    FROM matches m
    JOIN competitions c ON m.competition_id = c.id
    JOIN seasons s ON m.season_id = s.id
    GROUP BY c.name, s.season_code
    ORDER BY c.name, s.season_code
  `);
  console.log('--- Matches per Competition/Season ---');
  console.table(matchesRes.rows);

  // 2. Player match statistics per competition
  const statsRes = await client.query(`
    SELECT
      c.name AS competition,
      s.season_code AS season,
      COUNT(pms.id)::int AS stat_records,
      COUNT(DISTINCT pms.match_id)::int AS matches_with_stats,
      COUNT(DISTINCT pms.player_id)::int AS unique_players
    FROM player_match_statistics pms
    JOIN matches m ON pms.match_id = m.id
    JOIN competitions c ON m.competition_id = c.id
    JOIN seasons s ON m.season_id = s.id
    GROUP BY c.name, s.season_code
    ORDER BY c.name, s.season_code
  `);
  console.log('\n--- Player Match Statistics ---');
  if (statsRes.rows.length === 0) {
    console.log('  ⚠️  NO player_match_statistics found!');
    console.log('  → SPORTMONKS_API_KEY likely missing or invalid.');
    console.log('  → Check .env file and restart backend.\n');
  } else {
    console.table(statsRes.rows);
  }

  // 3. Player season statistics
  const seasonStatsRes = await client.query(`
    SELECT
      c.name AS competition,
      s.season_code AS season,
      COUNT(pss.id)::int AS season_stat_records,
      COUNT(DISTINCT pss.player_id)::int AS players_aggregated
    FROM player_season_statistics pss
    JOIN seasons s ON pss.season_id = s.id
    JOIN competitions c ON s.competition_id = c.id
    GROUP BY c.name, s.season_code
    ORDER BY c.name, s.season_code
  `);
  console.log('\n--- Player Season Statistics (Aggregated) ---');
  if (seasonStatsRes.rows.length === 0) {
    console.log('  ⚠️  No season statistics yet (requires player_match_statistics first).\n');
  } else {
    console.table(seasonStatsRes.rows);
  }

  // 4. Last 5 sync jobs
  const jobsRes = await client.query(`
    SELECT
      j.id,
      c.name AS competition,
      s.season_code AS season,
      j.status,
      j.target,
      j.scope,
      j.processed_count,
      j.created_count,
      j.updated_count,
      j.failed_count,
      TO_CHAR(j.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI:SS') AS started,
      TO_CHAR(j.completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI:SS') AS completed
    FROM data_sync_jobs j
    JOIN competitions c ON j.competition_id = c.id
    JOIN seasons s ON j.season_id = s.id
    ORDER BY j.started_at DESC
    LIMIT 5
  `);
  console.log('\n--- Last 5 Sync Jobs ---');
  console.table(jobsRes.rows);

  // 5. Sample recent stats (if any)
  const sampleStatsRes = await client.query(`
    SELECT
      p.name AS player,
      t.name AS team,
      m.match_date::date AS match_date,
      pms.goals,
      pms.assists,
      pms.minutes_played,
      pms.rating
    FROM player_match_statistics pms
    JOIN players p ON pms.player_id = p.id
    JOIN teams t ON pms.team_id = t.id
    JOIN matches m ON pms.match_id = m.id
    ORDER BY pms.created_at DESC
    LIMIT 10
  `);
  console.log('\n--- Sample Player Stats (Latest 10) ---');
  if (sampleStatsRes.rows.length === 0) {
    console.log('  No stats to display.\n');
  } else {
    console.table(sampleStatsRes.rows);
  }

  console.log('========================================\n');
  await client.end();
}

audit().catch((err) => {
  console.error('DB Audit failed:', err.message);
  client.end();
  process.exit(1);
});
