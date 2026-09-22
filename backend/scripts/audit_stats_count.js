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

  const lRes = await local.query(`
    SELECT c.name, count(pms.id) as stats_count, count(DISTINCT m.id) as match_count
    FROM player_match_statistics pms
    JOIN matches m ON pms.match_id = m.id
    JOIN competitions c ON m.competition_id = c.id
    GROUP BY c.name
    ORDER BY c.name
  `);

  const sRes = await supa.query(`
    SELECT c.name, count(pms.id) as stats_count, count(DISTINCT m.id) as match_count
    FROM player_match_statistics pms
    JOIN matches m ON pms.match_id = m.id
    JOIN competitions c ON m.competition_id = c.id
    GROUP BY c.name
    ORDER BY c.name
  `);

  console.log('=== Local Player Match Stats per League ===');
  console.table(lRes.rows);

  console.log('=== Supabase Player Match Stats per League ===');
  console.table(sRes.rows);

  await local.end();
  await supa.end();
}
test().catch(console.error);
