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

  const lTeams = await local.query("SELECT id, name, external_id, country FROM teams WHERE country IN ('Germany', 'Italy', 'France')");
  const sTeams = await supa.query("SELECT id, name, external_id, country FROM teams WHERE country IN ('Germany', 'Italy', 'France')");
  console.log(`Local teams: ${lTeams.rows.length}, Supa teams: ${sTeams.rows.length}`);

  const sMap = new Map(sTeams.rows.map(t => [t.id, t.name]));
  let missingOnSupa = 0;
  for (const lt of lTeams.rows) {
    if (!sMap.has(lt.id)) {
      console.log(`Missing on Supa: ${lt.name} (${lt.id})`);
      missingOnSupa++;
    }
  }
  console.log(`Total missing on Supabase: ${missingOnSupa}`);

  await local.end();
  await supa.end();
}
test().catch(console.error);
