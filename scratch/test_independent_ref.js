const { Client } = require('../backend/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres123',
  database: 'scoutboard_db'
});

const PL = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';
const ARSENAL = 'b66fe9e9-c125-4442-9955-c16340d9d4d9';
const REAL_MADRID = 'a6e6dd22-032f-474b-8105-ca7d34361831';

async function test() {
  await client.connect();

  console.log('--- CASE B Independent SQL: PL + La Liga, CM, Top 10 Goals/90 ---');
  const resB = await client.query(`
    WITH ranked AS (
      SELECT player.id, player.name, AVG(pss.goals_per_90) as metric_value,
             RANK() OVER (ORDER BY AVG(pss.goals_per_90) DESC) as player_rank
      FROM players player
      INNER JOIN player_season_statistics pss ON pss.player_id = player.id
      WHERE player.primary_position = 'CM'
        AND pss.competition_id IN ('${PL}', '${LA_LIGA}')
        AND pss.goals_per_90 IS NOT NULL
      GROUP BY player.id, player.name
    )
    SELECT * FROM ranked WHERE player_rank <= 10 ORDER BY metric_value DESC, name ASC;
  `);
  console.log('Case B Top players count:', resB.rows.length);
  console.log('Case B Top players:', resB.rows);

  console.log('\n--- CASE C Independent SQL: Arsenal + Real Madrid, CM, Top 10 Goals/90 ---');
  const resC = await client.query(`
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
  console.log('Case C Top players count:', resC.rows.length);
  console.log('Case C Top players:', resC.rows);

  console.log('\n--- CASE D Independent SQL: PL + La Liga, Arsenal + Real Madrid, CM, Goals/90 >= 0.10, Top 10 Goals/90 ---');
  const resD = await client.query(`
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
  console.log('Case D Top players count:', resD.rows.length);
  console.log('Case D Top players:', resD.rows);

  await client.end();
}

test().catch(console.error);
