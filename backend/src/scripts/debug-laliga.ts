import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres123',
    database: process.env.POSTGRES_DB || 'scoutboard_db',
  });
  await ds.initialize();

  const laligaCoverage = await ds.query(`
    SELECT 
      count(*) as total_laliga_players,
      count(height_cm) as with_height,
      count(weight_kg) as with_weight,
      count(date_of_birth) as with_dob,
      count(nationality) as with_nat
    FROM players p
    WHERE p.current_team_id IN (
      SELECT st.team_id FROM season_teams st 
      JOIN seasons s ON st.season_id = s.id 
      JOIN competitions c ON s.competition_id = c.id 
      WHERE c.name = 'La Liga'
    );
  `);
  console.log('=== La Liga Coverage ===');
  console.table(laligaCoverage);

  const sampleLaliga = await ds.query(`
    SELECT p.id, p.name, p.external_provider, p.external_id, p.height_cm, p.weight_kg, p.nationality, p.primary_position, t.name as team_name
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.current_team_id IN (
      SELECT st.team_id FROM season_teams st 
      JOIN seasons s ON st.season_id = s.id 
      JOIN competitions c ON s.competition_id = c.id 
      WHERE c.name = 'La Liga'
    )
    LIMIT 20;
  `);
  console.log('=== Sample La Liga Players ===');
  console.table(sampleLaliga);

  // Check players who DO have height
  const playersWithHeight = await ds.query(`
    SELECT p.id, p.name, p.external_provider, p.external_id, p.height_cm, p.weight_kg, p.nationality, t.name as team_name
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.current_team_id IN (
      SELECT st.team_id FROM season_teams st 
      JOIN seasons s ON st.season_id = s.id 
      JOIN competitions c ON s.competition_id = c.id 
      WHERE c.name = 'La Liga'
    )
    AND p.height_cm IS NOT NULL
    LIMIT 20;
  `);
  console.log(
    `=== Players with height (count: ${playersWithHeight.length}) ===`,
  );
  console.table(playersWithHeight);

  // Check what API-Football status says about quota
  const statusFetch = await fetch('https://v3.football.api-sports.io/status', {
    headers: {
      'x-apisports-key':
        process.env.API_FOOTBALL_KEY || '09b395257421d95a43fa4fd945df43b7',
    },
  }).then((r) => r.json());
  console.log('\n=== CURRENT API STATUS ===');
  console.log(JSON.stringify(statusFetch?.response?.requests, null, 2));

  await ds.destroy();
}

main().catch(console.error);
