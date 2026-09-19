import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const localClient = new Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
});

const supabaseClient = new Client({
  host: process.env.SUPABASE_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_PORT || '6543', 10),
  user: process.env.SUPABASE_USER || 'postgres.utpuxqpokpqnxpqqiens',
  password: process.env.SUPABASE_PASSWORD || '03082005Anhle@@',
  database: process.env.SUPABASE_DB || 'postgres',
  ssl: { rejectUnauthorized: false },
  statement_timeout: 60000,
});

async function run() {
  await localClient.connect();
  await supabaseClient.connect();
  console.log('✓ Connected to Local DB and Supabase Cloud.');

  // 1. Fetch all local players for GER, FRA, ITA
  const pRes = await localClient.query(`
    SELECT p.id, p.external_id, p.primary_position, p.raw_position
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE t.country IN ('Germany', 'France', 'Italy')
      AND p.external_provider = 'API_FOOTBALL';
  `);
  const players = pRes.rows;
  console.log(`Fetched ${players.length} players from local DB.`);

  // 2. Fetch all local player_positions
  const posRes = await localClient.query(`
    SELECT p.external_id, pp.position_code, pp.is_primary
    FROM player_positions pp
    JOIN players p ON pp.player_id = p.id
    JOIN teams t ON p.current_team_id = t.id
    WHERE t.country IN ('Germany', 'France', 'Italy')
      AND p.external_provider = 'API_FOOTBALL';
  `);
  const positions = posRes.rows;
  console.log(`Fetched ${positions.length} position mappings from local DB.`);

  // 3. Batch Update Players on Supabase (chunks of 400)
  console.log('Pushing player primary_position updates to Supabase Cloud...');
  const chunkSize = 400;
  for (let i = 0; i < players.length; i += chunkSize) {
    const chunk = players.slice(i, i + chunkSize);
    const params: any[] = [];
    const valuesParts: string[] = [];

    chunk.forEach((p, idx) => {
      const base = idx * 3;
      params.push(p.external_id, p.primary_position, p.raw_position);
      valuesParts.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    });

    await supabaseClient.query(`
      UPDATE players AS p
      SET 
        primary_position = v.pos,
        raw_position = v.raw,
        data_updated_at = NOW()
      FROM (VALUES ${valuesParts.join(', ')}) AS v(ext_id, pos, raw)
      WHERE p.external_provider = 'API_FOOTBALL' AND p.external_id = v.ext_id;
    `, params);
    console.log(`  ✓ Updated ${Math.min(i + chunkSize, players.length)}/${players.length} players in players table.`);
  }

  // 4. Batch Sync player_positions on Supabase
  console.log('Synchronizing player_positions on Supabase Cloud...');
  const allExtIds = players.map(p => p.external_id);

  // Clear old positions for these players
  await supabaseClient.query(`
    DELETE FROM player_positions
    WHERE player_id IN (
      SELECT id FROM players WHERE external_provider = 'API_FOOTBALL' AND external_id = ANY($1::text[])
    );
  `, [allExtIds]);
  console.log('  ✓ Cleared obsolete player_positions on Cloud.');

  // Insert new positions in chunks of 400
  for (let i = 0; i < positions.length; i += chunkSize) {
    const chunk = positions.slice(i, i + chunkSize);
    const params: any[] = [];
    const valuesParts: string[] = [];

    chunk.forEach((pos, idx) => {
      const base = idx * 3;
      params.push(pos.external_id, pos.position_code, pos.is_primary);
      valuesParts.push(`($${base + 1}, $${base + 2}, $${base + 3}::boolean)`);
    });

    await supabaseClient.query(`
      INSERT INTO player_positions (id, player_id, position_code, is_primary)
      SELECT gen_random_uuid(), p.id, v.pos, v.is_pri
      FROM players p
      JOIN (VALUES ${valuesParts.join(', ')}) AS v(ext_id, pos, is_pri)
        ON p.external_id = v.ext_id AND p.external_provider = 'API_FOOTBALL'
      ON CONFLICT DO NOTHING;
    `, params);
    console.log(`  ✓ Inserted ${Math.min(i + chunkSize, positions.length)}/${positions.length} player_positions.`);
  }

  console.log('\n🎉 ALL DONE! Supabase Cloud positions 100% synchronized in seconds!');
  await localClient.end();
  await supabaseClient.end();
}

run().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
