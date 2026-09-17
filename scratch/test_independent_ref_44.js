const { Client } = require('../backend/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres123',
  database: 'scoutboard_db',
});

const PL = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';
const ARSENAL = 'b66fe9e9-c125-4442-9955-c16340d9d4d9';
const REAL_MADRID = 'a6e6dd22-032f-474b-8105-ca7d34361831';

async function run() {
  await client.connect();
  console.log('=== TASK 4.4 INDEPENDENT POSTGRESQL REFERENCE CALCULATION ===\n');

  // CASE 3: Arsenal + Real Madrid, CM, Top 10 Goals/90
  console.log('--- CASE 3 Independent SQL: Arsenal + Real Madrid, CM, Top 10 Goals/90 ---');
  const res3 = await client.query(`
    WITH ranked AS (
      SELECT player.id, player.name, AVG(pss.goals_per_90) as metric_value,
             RANK() OVER (ORDER BY AVG(pss.goals_per_90) DESC) as player_rank
      FROM players player
      INNER JOIN player_season_statistics pss ON pss.player_id = player.id
      WHERE player.primary_position = 'CM'
        AND player.current_team_id IN ('${ARSENAL}', '${REAL_MADRID}')
        AND pss.goals_per_90 IS NOT NULL
      GROUP BY player.id, player.name
    )
    SELECT * FROM ranked WHERE player_rank <= 10 ORDER BY metric_value DESC, name ASC;
  `);
  console.log('Case 3 Total:', res3.rows.length);
  res3.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (id: ${r.id}, metric: ${r.metric_value}, rank: ${r.player_rank})`));

  // CASE 4: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90
  console.log('\n--- CASE 4 Independent SQL: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90 ---');
  const res4 = await client.query(`
    WITH ranked AS (
      SELECT player.id, player.name, AVG(pss.goals_per_90) as metric_value,
             RANK() OVER (ORDER BY AVG(pss.goals_per_90) DESC) as player_rank
      FROM players player
      INNER JOIN player_season_statistics pss ON pss.player_id = player.id
      WHERE player.primary_position = 'CM'
        AND pss.competition_id IN ('${PL}', '${LA_LIGA}')
        AND player.current_team_id IN ('${ARSENAL}', '${REAL_MADRID}')
        AND pss.goals_per_90 >= 0.10
      GROUP BY player.id, player.name
    )
    SELECT * FROM ranked WHERE player_rank <= 10 ORDER BY metric_value DESC, name ASC;
  `);
  console.log('Case 4 Total:', res4.rows.length);
  res4.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (id: ${r.id}, metric: ${r.metric_value}, rank: ${r.player_rank})`));

  // CASE 5: PL + La Liga, CM, Goals/90 [0.10, 0.50] AND Assists/90 [0.05, 0.50], Top 10 Goals/90
  console.log('\n--- CASE 5 Independent SQL: PL + La Liga, CM, Goals/90 [0.1, 0.5] AND Assists/90 [0.05, 0.5], Top 10 Goals/90 ---');
  const res5 = await client.query(`
    WITH ranked AS (
      SELECT player.id, player.name, AVG(pss.goals_per_90) as metric_value,
             RANK() OVER (ORDER BY AVG(pss.goals_per_90) DESC) as player_rank
      FROM players player
      INNER JOIN player_season_statistics pss ON pss.player_id = player.id
      WHERE player.primary_position = 'CM'
        AND pss.competition_id IN ('${PL}', '${LA_LIGA}')
        AND pss.goals_per_90 BETWEEN 0.10 AND 0.50
        AND pss.assists_per_90 BETWEEN 0.05 AND 0.50
        AND pss.goals_per_90 IS NOT NULL
      GROUP BY player.id, player.name
    )
    SELECT * FROM ranked WHERE player_rank <= 10 ORDER BY metric_value DESC, name ASC;
  `);
  console.log('Case 5 Total:', res5.rows.length);
  res5.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (id: ${r.id}, metric: ${r.metric_value}, rank: ${r.player_rank})`));

  // CASE 6: GK, clean_sheets >= 1, Top 5 clean_sheets
  console.log('\n--- CASE 6 Independent SQL: GK, clean_sheets >= 1, Top 5 clean_sheets ---');
  const res6 = await client.query(`
    WITH ranked AS (
      SELECT player.id, player.name, AVG(pss.clean_sheets) as metric_value,
             RANK() OVER (ORDER BY AVG(pss.clean_sheets) DESC) as player_rank
      FROM players player
      INNER JOIN player_season_statistics pss ON pss.player_id = player.id
      WHERE player.primary_position = 'GK'
        AND pss.clean_sheets >= 1
        AND pss.clean_sheets IS NOT NULL
      GROUP BY player.id, player.name
    )
    SELECT * FROM ranked WHERE player_rank <= 5 ORDER BY metric_value DESC, name ASC;
  `);
  console.log('Case 6 Total:', res6.rows.length);
  res6.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} (id: ${r.id}, metric: ${r.metric_value}, rank: ${r.player_rank})`));

  await client.end();
}

run().catch(console.error);
