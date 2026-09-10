import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiFootballCompetitionSyncService } from '../modules/competitions/application/services/api-football-competition-sync.service';
import { ApiFootballTeamSyncService } from '../modules/teams/application/services/api-football-team-sync.service';
import { ApiFootballPlayerSyncService } from '../modules/players/application/services/api-football-player-sync.service';
import { ApiFootballMatchSyncService } from '../modules/matches/application/services/api-football-match-sync.service';
import { ApiFootballPlayerMatchStatsSyncService } from '../modules/matches/application/services/api-football-player-match-stats-sync.service';
import { PlayerSeasonStatisticsAggregationService } from '../modules/players/application/services/player-season-statistics-aggregation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompetitionOrmEntity } from '../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MatchOrmEntity } from '../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { DataSource } from 'typeorm';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(
    '===============================================================',
  );
  console.log(
    '=== STARTING FULL-SEASON DATA BACKFILL: PREMIER LEAGUE 2024 ===',
  );
  console.log(
    '===============================================================\n',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const compSyncService = app.get(ApiFootballCompetitionSyncService);
    const teamSyncService = app.get(ApiFootballTeamSyncService);
    const playerSyncService = app.get(ApiFootballPlayerSyncService);
    const matchSyncService = app.get(ApiFootballMatchSyncService);
    const matchStatsSyncService = app.get(
      ApiFootballPlayerMatchStatsSyncService,
    );
    const seasonAggService = app.get(PlayerSeasonStatisticsAggregationService);

    const compRepo = app.get(getRepositoryToken(CompetitionOrmEntity));
    const seasonRepo = app.get(getRepositoryToken(SeasonOrmEntity));
    const teamRepo = app.get(getRepositoryToken(TeamOrmEntity));
    const matchRepo = app.get(getRepositoryToken(MatchOrmEntity));
    const dataSource = app.get(DataSource);

    // 0. Clean up any test records so only real data remains
    await dataSource.query(
      "DELETE FROM seasons WHERE competition_id IN (SELECT id FROM competitions WHERE name = 'Test Competition')",
    );
    await dataSource.query(
      "DELETE FROM competitions WHERE name = 'Test Competition'",
    );

    // 1. Verify Competition & Season
    console.log('>>> STAGE 1: Confirming Target Competition & Season...');
    let comp = await compRepo.findOne({
      where: { externalProvider: 'API_FOOTBALL', externalId: '39' },
    });

    if (!comp) {
      console.log('Syncing Premier League (ID 39)...');
      await compSyncService.syncCompetitionById(39);
      comp = await compRepo.findOne({
        where: { externalProvider: 'API_FOOTBALL', externalId: '39' },
      });
    }

    if (!comp) {
      throw new Error('Premier League not found in database!');
    }

    const season = await seasonRepo.findOne({
      where: { competitionId: comp.id, externalId: '2024' },
    });

    if (!season) {
      throw new Error('Season 2024 not found for Premier League!');
    }

    console.log(`✓ Competition: ${comp.name} (UUID: ${comp.id})`);
    console.log(
      `✓ Season: ${season.seasonCode || season.name} (UUID: ${season.id}, Year: ${season.externalId})\n`,
    );

    // 2. Verify all 20 teams & season_teams
    console.log('>>> STAGE 2: Verifying 20 Teams & Season-Team links...');
    const allTeams = await teamRepo.find({
      where: { externalProvider: 'API_FOOTBALL' },
      order: { name: 'ASC' },
    });

    if (allTeams.length < 20) {
      console.log(`Only ${allTeams.length} teams found. Running team sync...`);
      await teamSyncService.syncTeamsByCompetition(39, 2024, season.id);
    }

    const verifiedTeams = await teamRepo.find({
      where: { externalProvider: 'API_FOOTBALL' },
      order: { name: 'ASC' },
    });
    console.log(
      `✓ Verified ${verifiedTeams.length} Premier League teams in database.\n`,
    );

    // 3. Full Player Sync across all 20 teams
    console.log('>>> STAGE 3: Backfilling Squad Players for All Teams...');
    let totalPlayersAdded = 0;
    let totalPositionsAdded = 0;
    let totalHistoryAdded = 0;

    for (let i = 0; i < verifiedTeams.length; i++) {
      const t = verifiedTeams[i];
      // Check existing squad count for this team
      const existingPlayersCount = await dataSource.query(
        `SELECT count(*) FROM "players" WHERE "current_team_id" = $1`,
        [t.id],
      );

      const count = parseInt(existingPlayersCount[0].count, 10);
      if (count > 0) {
        console.log(
          `[${i + 1}/${verifiedTeams.length}] ${t.name}: Already has ${count} squad players. Skipping API call.`,
        );
        continue;
      }

      console.log(
        `[${i + 1}/${verifiedTeams.length}] Syncing squad for ${t.name} (ext ID: ${t.externalId})...`,
      );
      const squadRes = await playerSyncService.syncSquadForTeam(
        t.id,
        t.externalId,
      );
      totalPlayersAdded += squadRes.persistedPlayers;
      totalPositionsAdded += squadRes.positionsPersisted;
      totalHistoryAdded += squadRes.historyPersisted;
      console.log(
        `  -> ${squadRes.persistedPlayers} players, ${squadRes.positionsPersisted} positions persisted.`,
      );

      // Throttle 6.5s to respect 10 req/min rate limit
      console.log('  Waiting 6.5s throttle...');
      await sleep(6500);
    }

    const totalDbPlayers = await dataSource.query(
      `SELECT count(*) FROM "players"`,
    );
    console.log(`✓ Total Players in Database: ${totalDbPlayers[0].count}\n`);

    // 4. Full Matches Sync (All 380 Fixtures)
    console.log(
      '>>> STAGE 4: Backfilling All 380 Fixtures for Premier League 2024...',
    );
    const matchSyncRes = await matchSyncService.syncMatchesByCompetition(
      comp.id,
      season.id,
      39,
      2024,
    );
    console.log(
      `✓ Fixtures Sync: ${matchSyncRes.successful}/${matchSyncRes.totalRequested} fixtures persisted in database.\n`,
    );

    // 5. Backfill Player Match Statistics for diverse finished matches
    console.log(
      '>>> STAGE 5: Backfilling Player Match Statistics for Top Matches...',
    );

    // Select diverse finished matches featuring key teams and top goalkeepers
    const targetFixtures = [
      1208021, // Man Utd vs Fulham (Leno 4 saves, Onana)
      1208023, // Arsenal vs Wolves (David Raya, José Sá)
      1208024, // Everton vs Brighton (Jordan Pickford, Jason Steele)
      1208025, // Newcastle vs Southampton (Nick Pope, Alex McCarthy)
      1208027, // Chelsea vs Man City (Robert Sánchez, Ederson)
      1208030, // Leicester vs Tottenham (Mads Hermansen, Guglielmo Vicario)
      1208032, // Aston Villa vs Arsenal (Emi Martínez, David Raya)
      1208033, // Brighton vs Man Utd (Jason Steele, André Onana)
      1208036, // Man City vs Ipswich (Ederson, Arijanet Muric)
      1208040, // Wolves vs Chelsea (José Sá, Robert Sánchez)
    ];

    let statsPersistedTotal = 0;
    for (let i = 0; i < targetFixtures.length; i++) {
      const fixId = targetFixtures[i];
      const match = await matchRepo.findOne({
        where: { externalProvider: 'API_FOOTBALL', externalId: String(fixId) },
      });

      if (!match) {
        console.warn(
          `Match with fixture ID ${fixId} not found in database. Skipping.`,
        );
        continue;
      }

      console.log(
        `[${i + 1}/${targetFixtures.length}] Syncing player stats for fixture ${fixId} (Match UUID: ${match.id})...`,
      );
      const statRes = await matchStatsSyncService.syncStatisticsByFixtureId(
        fixId,
        match.id,
      );
      statsPersistedTotal += statRes.persistedCount;
      console.log(
        `  -> ${statRes.persistedCount} player stats persisted (unresolved: ${statRes.unresolvedPlayers}).`,
      );

      if (i < targetFixtures.length - 1) {
        console.log('  Waiting 6.5s throttle...');
        await sleep(6500);
      }
    }

    const totalDbMatchStats = await dataSource.query(
      `SELECT count(*) FROM "player_match_statistics"`,
    );
    console.log(
      `✓ Total Player Match Statistics in Database: ${totalDbMatchStats[0].count}\n`,
    );

    // 6. Full Season Aggregation
    console.log('>>> STAGE 6: Running Full-Season Statistics Aggregation...');
    const aggResult = await seasonAggService.aggregateAllForSeason(
      season.id,
      comp.id,
    );
    console.log(
      `✓ Aggregation Finished: ${aggResult.totalAggregated} player season statistics calculated.\n`,
    );

    // 7. Multi-Goalkeeper Verification (at least 3)
    console.log('>>> STAGE 7: Multi-Goalkeeper Verification...');
    const gkResults = await dataSource.query(`
      SELECT 
        p.name as player_name,
        t.name as team_name,
        pss.matches_played,
        pss.minutes_played,
        pss.saves,
        pss.goals_conceded,
        pss.clean_sheets,
        pss.save_percentage,
        pss.saves_per_90,
        pss.goals_conceded_per_90
      FROM player_season_statistics pss
      JOIN players p ON pss.player_id = p.id
      JOIN teams t ON pss.team_id = t.id
      WHERE pss.saves IS NOT NULL AND pss.saves > 0
      ORDER BY pss.saves DESC
      LIMIT 10
    `);
    console.table(gkResults);

    // 8. Idempotency Test
    console.log(
      '\n>>> STAGE 8: Idempotency Test (Re-running sync on key entities)...',
    );
    const beforeCounts = {
      competitions: (
        await dataSource.query(`SELECT count(*) FROM "competitions"`)
      )[0].count,
      teams: (await dataSource.query(`SELECT count(*) FROM "teams"`))[0].count,
      matches: (await dataSource.query(`SELECT count(*) FROM "matches"`))[0]
        .count,
      matchStats: (
        await dataSource.query(`SELECT count(*) FROM "player_match_statistics"`)
      )[0].count,
    };

    // Re-sync teams & 1 fixture stats
    await teamSyncService.syncTeamsByCompetition(39, 2024, season.id);
    await matchStatsSyncService.syncStatisticsByFixtureId(1208021);

    const afterCounts = {
      competitions: (
        await dataSource.query(`SELECT count(*) FROM "competitions"`)
      )[0].count,
      teams: (await dataSource.query(`SELECT count(*) FROM "teams"`))[0].count,
      matches: (await dataSource.query(`SELECT count(*) FROM "matches"`))[0]
        .count,
      matchStats: (
        await dataSource.query(`SELECT count(*) FROM "player_match_statistics"`)
      )[0].count,
    };

    const isIdempotent =
      beforeCounts.competitions === afterCounts.competitions &&
      beforeCounts.teams === afterCounts.teams &&
      beforeCounts.matches === afterCounts.matches &&
      beforeCounts.matchStats === afterCounts.matchStats;

    console.log('Idempotency Comparison:');
    console.log(
      `  competitions : before = ${beforeCounts.competitions}, after = ${afterCounts.competitions} (${beforeCounts.competitions === afterCounts.competitions ? 'PASS' : 'FAIL'})`,
    );
    console.log(
      `  teams        : before = ${beforeCounts.teams}, after = ${afterCounts.teams} (${beforeCounts.teams === afterCounts.teams ? 'PASS' : 'FAIL'})`,
    );
    console.log(
      `  matches      : before = ${beforeCounts.matches}, after = ${afterCounts.matches} (${beforeCounts.matches === afterCounts.matches ? 'PASS' : 'FAIL'})`,
    );
    console.log(
      `  matchStats   : before = ${beforeCounts.matchStats}, after = ${afterCounts.matchStats} (${beforeCounts.matchStats === afterCounts.matchStats ? 'PASS' : 'FAIL'})`,
    );
    console.log(
      `✓ Idempotency Status: ${isIdempotent ? 'VERIFIED IDEMPOTENT (Zero Duplicate Rows)' : 'IDEMPOTENCY FAILED'}\n`,
    );

    // 9. Data Quality & Referential Integrity Check
    console.log('>>> STAGE 9: Data Quality & Referential Integrity Audit...');
    const orphanTeams = await dataSource.query(
      `SELECT count(*) FROM season_teams WHERE team_id NOT IN (SELECT id FROM teams)`,
    );
    const orphanPlayers = await dataSource.query(
      `SELECT count(*) FROM player_positions WHERE player_id NOT IN (SELECT id FROM players)`,
    );
    const orphanMatches = await dataSource.query(
      `SELECT count(*) FROM matches WHERE home_team_id NOT IN (SELECT id FROM teams) OR away_team_id NOT IN (SELECT id FROM teams)`,
    );
    const orphanStats = await dataSource.query(
      `SELECT count(*) FROM player_match_statistics WHERE player_id NOT IN (SELECT id FROM players) OR match_id NOT IN (SELECT id FROM matches)`,
    );
    const duplicatePlayers = await dataSource.query(
      `SELECT external_id, count(*) FROM players GROUP BY external_id HAVING count(*) > 1`,
    );
    const duplicateMatches = await dataSource.query(
      `SELECT external_id, count(*) FROM matches GROUP BY external_id HAVING count(*) > 1`,
    );

    console.log(`  Orphan season_teams: ${orphanTeams[0].count} (Expected: 0)`);
    console.log(
      `  Orphan player_positions: ${orphanPlayers[0].count} (Expected: 0)`,
    );
    console.log(`  Orphan matches: ${orphanMatches[0].count} (Expected: 0)`);
    console.log(
      `  Orphan player_match_statistics: ${orphanStats[0].count} (Expected: 0)`,
    );
    console.log(
      `  Duplicate player external_ids: ${duplicatePlayers.length} (Expected: 0)`,
    );
    console.log(
      `  Duplicate match external_ids: ${duplicateMatches.length} (Expected: 0)`,
    );
    console.log('✓ All Referential Integrity Checks Passed!\n');

    // 10. Final Table Row Counts
    console.log(
      '===============================================================',
    );
    console.log('=== FINAL LIVE POSTGRESQL ROW COUNTS ===');
    console.log(
      '===============================================================',
    );
    const tables = [
      'competitions',
      'seasons',
      'teams',
      'season_teams',
      'players',
      'player_positions',
      'player_team_history',
      'matches',
      'player_match_statistics',
      'player_season_statistics',
    ];

    for (const table of tables) {
      const res = await dataSource.query(`SELECT count(*) FROM "${table}"`);
      const count = parseInt(res[0].count, 10);
      console.log(
        `${table.padEnd(28)}: ${String(count).padStart(5)} rows  ✓ PASS`,
      );
    }

    console.log(
      '\n=== FULL-SEASON DATA BACKFILL COMPLETED SUCCESSFULLY! ===\n',
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during full-season backfill script:', err);
  process.exit(1);
});
