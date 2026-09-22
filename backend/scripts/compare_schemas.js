const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Client } = require('pg');

async function test() {
  const local = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'scoutboard_db',
  });

  const supa = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.utpuxqpokpqnxpqqiens',
    password: '03082005Anhle@@',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30000,
  });

  await local.connect();
  await supa.connect();

  const tables = ['matches', 'player_match_statistics', 'player_season_statistics'];
  for (const t of tables) {
    const lCols = await local.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name`,
      [t]
    );
    const sCols = await supa.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name`,
      [t]
    );
    console.log(`\n=== Table: ${t} ===`);
    console.log('Local count:', lCols.rows.length, 'Supa count:', sCols.rows.length);
    const sNames = new Set(sCols.rows.map(r => r.column_name));
    const lNames = new Set(lCols.rows.map(r => r.column_name));
    const onlyLocal = [...lNames].filter(x => !sNames.has(x));
    const onlySupa = [...sNames].filter(x => !lNames.has(x));
    if (onlyLocal.length > 0) console.log('  Only in Local:', onlyLocal);
    if (onlySupa.length > 0) console.log('  Only in Supa:', onlySupa);
    if (onlyLocal.length === 0 && onlySupa.length === 0) console.log('  ✓ Column names match 100%!');
  }

  await local.end();
  await supa.end();
}

test().catch(console.error);
