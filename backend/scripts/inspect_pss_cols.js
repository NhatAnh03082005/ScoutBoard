const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Client } = require('pg');

async function test() {
  const supa = new Client({
    host: 'aws-0-ap-south-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.utpuxqpokpqnxpqqiens',
    password: '03082005Anhle@@',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await supa.connect();
  const res = await supa.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'player_season_statistics'
    ORDER BY ordinal_position
  `);
  console.table(res.rows);
  await supa.end();
}
test().catch(console.error);
