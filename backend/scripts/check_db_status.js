const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
});

async function main() {
  await client.connect();
  console.log('====================================================');
  console.log('       SCOUTBOARD DATABASE AUDIT REPORT             ');
  console.log('====================================================\n');

  console.log('=== 1. TỔNG QUAN RECORD CÁC BẢNG CHÍNH ===');
  const countQuery = `
    SELECT 
      (SELECT COUNT(*) FROM competitions) as total_competitions,
      (SELECT COUNT(*) FROM seasons) as total_seasons,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM players) as total_players,
      (SELECT COUNT(*) FROM matches) as total_matches,
      (SELECT COUNT(*) FROM player_match_statistics) as total_match_stats,
      (SELECT COUNT(*) FROM player_season_statistics) as total_season_stats
  `;
  const counts = await client.query(countQuery);
  console.table(counts.rows);

  console.log('\n=== 2. SỐ LƯỢNG TRẬN ĐẤU (MATCHES) THEO GIẢI ĐẤU & MÙA GIẢI ===');
  const matches = await client.query(`
    SELECT c.name as competition, s.name as season, 
           COUNT(m.id) as total_matches,
           COUNT(CASE WHEN m.status = 'FINISHED' THEN 1 END) as finished_matches,
           COUNT(CASE WHEN m.status = 'TIMED' OR m.status = 'SCHEDULED' THEN 1 END) as scheduled_matches
    FROM matches m
    JOIN competitions c ON m.competition_id = c.id
    JOIN seasons s ON m.season_id = s.id
    GROUP BY c.name, s.name
    ORDER BY c.name, s.name
  `);
  console.table(matches.rows);

  console.log('\n=== 3. SỐ LƯỢNG THỐNG KÊ MÙA GIẢI (PLAYER SEASON STATS) ===');
  const seasonStats = await client.query(`
    SELECT c.name as competition, s.name as season, COUNT(pss.id) as total_season_stats_records
    FROM player_season_statistics pss
    JOIN competitions c ON pss.competition_id = c.id
    JOIN seasons s ON pss.season_id = s.id
    GROUP BY c.name, s.name
    ORDER BY c.name, s.name
  `);
  console.table(seasonStats.rows);

  console.log('\n=== 4. CÁC TIẾN TRÌNH ĐỒNG BỘ GẦN NHẤT (DATA_SYNC_JOBS) ===');
  const jobs = await client.query(`
    SELECT id, target, scope, status, processed_count, created_count, updated_count, failed_count, created_at, completed_at
    FROM data_sync_jobs 
    ORDER BY created_at DESC 
    LIMIT 6
  `);
  console.table(jobs.rows);

  console.log('\n=== 5. MẪU DỮ LIỆU PLAYER SEASON STATS MỚI CẬP NHẬT ===');
  const topStats = await client.query(`
    SELECT pss.id, pss.player_id, pss.competition_id, pss.season_id, 
           pss.appearances, pss.minutes_played, pss.goals, pss.assists, pss.updated_at
    FROM player_season_statistics pss
    ORDER BY pss.updated_at DESC
    LIMIT 10
  `);
  console.table(topStats.rows);

  await client.end();
}

main().catch((err) => {
  console.error('Error running audit:', err);
  process.exit(1);
});
