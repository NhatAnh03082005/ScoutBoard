const { Client } = require('pg');

async function test() {
  const local = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'scoutboard_db',
  });
  await local.connect();

  const res = await local.query(`
    SELECT conname, relname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname IN ('matches', 'player_match_statistics', 'player_season_statistics')
      AND c.contype IN ('u', 'p');
  `);
  console.table(res.rows);
  await local.end();
}
test().catch(console.error);
