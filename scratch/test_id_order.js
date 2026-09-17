const { Client } = require('../backend/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres123',
  database: 'scoutboard_db',
});

async function test() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  const PL = '9cef6c96-c74e-432d-b0f2-7867ee7f3e07';
  const LA_LIGA = 'ad6261b7-7170-4824-aeed-edeb1e03a05f';

  // Let's test the full query as TypeORM would build it
  const sql = `
    SELECT player.id as id, AVG(pss.goals_per_90) as rank_metric
    FROM players player
    INNER JOIN player_season_statistics pss ON pss.player_id = player.id
    WHERE (
      ((pss.competition_id = '${PL}') OR (pss.competition_id = '${LA_LIGA}'))
      AND (player.primary_position = 'CM')
      AND EXISTS (
        SELECT 1 FROM player_season_statistics candidate_pss
        WHERE candidate_pss.player_id = player.id
          AND candidate_pss.goals_per_90 IS NOT NULL
          AND (
            SELECT COALESCE(
              MIN(ranked.player_rank) FILTER (WHERE ranked.metric_value = candidate_pss.goals_per_90),
              COUNT(*) FILTER (WHERE ranked.metric_value > candidate_pss.goals_per_90) + 1
            )
            FROM (
              SELECT ranked_values.metric_value,
                     RANK() OVER (ORDER BY ranked_values.metric_value DESC) AS player_rank
              FROM (
                SELECT AVG(cohort_pss.goals_per_90) AS metric_value
                FROM player_season_statistics cohort_pss
                INNER JOIN players cohort_player ON cohort_player.id = cohort_pss.player_id
                WHERE ((cohort_pss.competition_id = '${PL}') OR (cohort_pss.competition_id = '${LA_LIGA}'))
                  AND (cohort_player.primary_position = 'CM')
                  AND cohort_pss.goals_per_90 IS NOT NULL
                GROUP BY cohort_pss.player_id
              ) ranked_values
            ) ranked
          ) <= 10
      )
    )
    GROUP BY player.id, player.name
    ORDER BY rank_metric DESC, player.name ASC, player.id ASC
    LIMIT 50 OFFSET 0;
  `;

  const res = await client.query(sql);
  console.log('Returned count:', res.rows.length);
  console.log('Returned rows:', res.rows);

  await client.end();
}

test().catch(console.error);
