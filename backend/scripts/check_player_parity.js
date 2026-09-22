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
  });

  await local.connect();
  await supa.connect();

  const lPlayers = await local.query("SELECT p.id, p.name, p.external_id FROM players p JOIN teams t ON p.current_team_id = t.id WHERE t.country IN ('Germany', 'Italy', 'France')");
  const sPlayers = await supa.query("SELECT p.id, p.name, p.external_id FROM players p JOIN teams t ON p.current_team_id = t.id WHERE t.country IN ('Germany', 'Italy', 'France')");
  console.log(`Local players: ${lPlayers.rows.length}, Supa players: ${sPlayers.rows.length}`);

  await local.end();
  await supa.end();
}
test().catch(console.error);
