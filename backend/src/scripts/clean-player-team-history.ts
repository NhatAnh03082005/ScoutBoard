import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres123';
const DB_NAME = process.env.POSTGRES_DB || 'scoutboard_db';

async function runCleanup() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  console.log('======================================================================');
  console.log('=== CLEANING DUPLICATE PLAYER TEAM HISTORY & ADDING UNIQUE INDEX   ===');
  console.log('======================================================================\n');

  try {
    const beforeCount = await client.query('SELECT count(*) FROM player_team_history;');
    console.log(`[1] Total rows before cleanup: ${beforeCount.rows[0].count}`);

    // Step A: Remove redundant NULL start_date rows if a dated record exists for that player & team
    const stepARes = await client.query(`
      DELETE FROM player_team_history p1
      WHERE p1.start_date IS NULL
        AND EXISTS (
          SELECT 1 FROM player_team_history p2
          WHERE p2.player_id = p1.player_id
            AND p2.team_id = p1.team_id
            AND p2.start_date IS NOT NULL
        );
    `);
    console.log(`[2] Removed ${stepARes.rowCount} redundant NULL-date placeholder rows (where real transfer date exists).`);

    // Step B: Remove duplicate rows with exact same (player_id, team_id, COALESCE(start_date, '1900-01-01'))
    const stepBRes = await client.query(`
      DELETE FROM player_team_history
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY player_id, team_id, COALESCE(start_date, '1900-01-01')
                   ORDER BY is_current DESC, end_date DESC NULLS LAST, created_at ASC
                 ) as rn
          FROM player_team_history
        ) t
        WHERE t.rn > 1
      );
    `);
    console.log(`[3] Removed ${stepBRes.rowCount} identical duplicate rows.`);

    // Step C: Correct is_current flag based on players.current_team_id
    const stepC1Res = await client.query(`
      UPDATE player_team_history pth
      SET is_current = false
      FROM players p
      WHERE pth.player_id = p.id
        AND (p.current_team_id IS NULL OR pth.team_id != p.current_team_id)
        AND pth.is_current = true;
    `);
    console.log(`[4] Fixed ${stepC1Res.rowCount} historical records that were incorrectly flagged as is_current = true.`);

    const stepC2Res = await client.query(`
      UPDATE player_team_history pth
      SET is_current = true
      FROM players p
      WHERE pth.player_id = p.id
        AND p.current_team_id IS NOT NULL
        AND pth.team_id = p.current_team_id
        AND pth.is_current = false;
    `);
    console.log(`[5] Ensured ${stepC2Res.rowCount} current club records are correctly flagged as is_current = true.`);

    // Step D: Create Unique Index to permanently prevent any future duplicates
    console.log('\n[6] Creating UNIQUE INDEX on player_team_history...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_player_team_history_unique_entry"
      ON player_team_history (player_id, team_id, COALESCE(start_date, '1900-01-01'));
    `);
    console.log('✓ Unique index IDX_player_team_history_unique_entry created successfully.');

    // Step E: Final verification
    const afterCount = await client.query('SELECT count(*) FROM player_team_history;');
    const uniqueCount = await client.query(`
      SELECT count(distinct (player_id, team_id, COALESCE(start_date, '1900-01-01'))) FROM player_team_history;
    `);

    console.log('\n======================================================================');
    console.log('=== CLEANUP SUMMARY ===');
    console.log('======================================================================');
    console.log(`Total rows after cleanup: ${afterCount.rows[0].count}`);
    console.log(`Unique key rows:          ${uniqueCount.rows[0].count}`);
    console.log(`Total duplicates:         ${parseInt(afterCount.rows[0].count, 10) - parseInt(uniqueCount.rows[0].count, 10)} (Must be 0)`);

    // Verify Sample Players
    const sampleRes = await client.query(`
      SELECT p.name, t.name as team_name, pth.start_date, pth.end_date, pth.is_current
      FROM player_team_history pth
      JOIN players p ON p.id = pth.player_id
      JOIN teams t ON t.id = pth.team_id
      WHERE p.name ILIKE '%Kane%' OR p.name ILIKE '%Mbapp%' OR p.name ILIKE '%Bellingham%'
      ORDER BY p.name, pth.start_date ASC NULLS FIRST;
    `);
    console.log('\nSample Star Players Career History in DB:');
    console.table(sampleRes.rows);

  } catch (err: any) {
    console.error('❌ Error during cleanup:', err.message);
  } finally {
    await client.end();
  }
}

runCleanup().catch(console.error);
