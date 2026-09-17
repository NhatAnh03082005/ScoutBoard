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

  console.log(
    '================================================================',
  );
  console.log(
    '=== SCOUTBOARD COMPREHENSIVE DATA COVERAGE AUDIT             ===',
  );
  console.log(
    '================================================================\n',
  );

  console.log('--- 1. MATCHES & FIXTURES COVERAGE BY LEAGUE (VIA TEAMS) ---');
  const matchesByCountry = await ds.query(`
    SELECT 
      CASE WHEN ht.country = 'Spain' THEN 'La Liga (Spain)' 
           WHEN ht.country = 'England' THEN 'Premier League (England)' 
           ELSE ht.country END as league,
      COUNT(m.id) as total_fixtures,
      COUNT(CASE WHEN m.status = 'FINISHED' THEN 1 END) as finished_fixtures,
      COUNT(CASE WHEN EXISTS (SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id) THEN 1 END) as matches_with_full_stats,
      ROUND(
        COUNT(CASE WHEN EXISTS (SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id) THEN 1 END) * 100.0 / 
        NULLIF(COUNT(m.id), 0), 
        1
      ) as sync_percentage
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    GROUP BY ht.country
    ORDER BY ht.country;
  `);
  console.table(matchesByCountry);

  console.log('\n--- 2. PLAYER PHYSICAL PROFILE & POSITION ENRICHMENT ---');
  const players = await ds.query(`
    SELECT 
      CASE WHEN t.country = 'Spain' THEN 'La Liga' 
           WHEN t.country = 'England' THEN 'Premier League' 
           ELSE t.country END as competition,
      COUNT(DISTINCT p.id) as total_players,
      COUNT(DISTINCT CASE WHEN p.primary_position IS NOT NULL THEN p.id END) as with_position,
      ROUND(COUNT(DISTINCT CASE WHEN p.primary_position IS NOT NULL THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as pos_pct,
      COUNT(DISTINCT CASE WHEN p.height_cm IS NOT NULL THEN p.id END) as with_height,
      ROUND(COUNT(DISTINCT CASE WHEN p.height_cm IS NOT NULL THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as height_pct,
      COUNT(DISTINCT CASE WHEN p.weight_kg IS NOT NULL THEN p.id END) as with_weight,
      ROUND(COUNT(DISTINCT CASE WHEN p.weight_kg IS NOT NULL THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as weight_pct,
      COUNT(DISTINCT CASE WHEN p.date_of_birth IS NOT NULL THEN p.id END) as with_dob,
      ROUND(COUNT(DISTINCT CASE WHEN p.date_of_birth IS NOT NULL THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as dob_pct,
      COUNT(DISTINCT CASE WHEN p.nationality IS NOT NULL THEN p.id END) as with_nationality,
      ROUND(COUNT(DISTINCT CASE WHEN p.nationality IS NOT NULL THEN p.id END) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as nat_pct
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    GROUP BY t.country
    ORDER BY t.country;
  `);
  console.table(players);

  console.log('\n--- 3. PLAYER SEASON STATISTICS AGGREGATION ---');
  const seasonStats = await ds.query(`
    SELECT 
      CASE WHEN t.country = 'Spain' THEN 'La Liga' 
           WHEN t.country = 'England' THEN 'Premier League' 
           ELSE t.country END as competition,
      COUNT(DISTINCT p.id) as total_squad_players,
      COUNT(DISTINCT pss.player_id) as with_season_stats,
      ROUND(COUNT(DISTINCT pss.player_id) * 100.0 / NULLIF(COUNT(DISTINCT p.id), 0), 1) as season_stats_pct
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    LEFT JOIN player_season_statistics pss ON pss.player_id = p.id
    GROUP BY t.country
    ORDER BY t.country;
  `);
  console.table(seasonStats);

  console.log('\n--- 4. OVERALL TOTALS IN SCOUTBOARD ---');
  const totals = await ds.query(`
    SELECT 
      (SELECT COUNT(*) FROM players) as total_players_in_db,
      (SELECT COUNT(*) FROM teams) as total_teams_in_db,
      (SELECT COUNT(*) FROM matches) as total_matches_in_db,
      (SELECT COUNT(DISTINCT match_id) FROM player_match_statistics) as matches_with_full_player_stats,
      (SELECT COUNT(*) FROM player_match_statistics) as total_player_match_stat_rows,
      (SELECT COUNT(*) FROM player_season_statistics) as total_player_season_stat_rows;
  `);
  console.table(totals);

  await ds.destroy();
}

main().catch(console.error);
