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

  console.log('=== CÁC CỘT CỦA BẢNG PLAYERS ===');
  const pCols = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'players'
  `);
  console.log(pCols.rows.map(r => r.column_name).join(', '));

  console.log('\n=== MẪU DỮ LIỆU CẦU THỦ VÀ PLAYER_SEASON_STATISTICS ===');
  const sampleStats = await client.query(`
    SELECT p.name, c.name as competition, s.name as season,
           pss.matches_played, pss.starts, pss.minutes_played, pss.goals, pss.assists,
           pss.updated_at
    FROM player_season_statistics pss
    JOIN players p ON pss.player_id = p.id
    JOIN competitions c ON pss.competition_id = c.id
    JOIN seasons s ON pss.season_id = s.id
    ORDER BY pss.updated_at DESC
    LIMIT 15
  `);
  console.table(sampleStats.rows);

  console.log('\n=== KIỂM TRA SỐ LƯỢNG PLAYER MATCH STATS THEO MÙA GIẢI ===');
  const matchStatsBreakdown = await client.query(`
    SELECT c.name as competition, s.name as season, COUNT(pms.id) as total_match_stats
    FROM player_match_statistics pms
    JOIN matches m ON pms.match_id = m.id
    JOIN competitions c ON m.competition_id = c.id
    JOIN seasons s ON m.season_id = s.id
    GROUP BY c.name, s.name
  `);
  console.table(matchStatsBreakdown.rows);

  await client.end();
}

main().catch(console.error);
