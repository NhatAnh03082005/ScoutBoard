import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiFootballCompetitionSyncService } from '../modules/competitions/application/services/api-football-competition-sync.service';
import { ApiFootballTeamSyncService } from '../modules/teams/application/services/api-football-team-sync.service';
import { ApiFootballPlayerSyncService } from '../modules/players/application/services/api-football-player-sync.service';
import { ApiFootballMatchSyncService } from '../modules/matches/application/services/api-football-match-sync.service';
import { ApiFootballPlayerMatchStatsSyncService } from '../modules/matches/application/services/api-football-player-match-stats-sync.service';
import { PlayerSeasonStatisticsAggregationService } from '../modules/players/application/services/player-season-statistics-aggregation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeasonOrmEntity } from '../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { DataSource } from 'typeorm';

async function main() {
  console.log(
    '=== STARTING VERTICAL SLICE SYNC: API-FOOTBALL -> POSTGRESQL ===\n',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
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
    const seasonRepo = app.get(getRepositoryToken(SeasonOrmEntity));
    const dataSource = app.get(DataSource);

    // STEP 1: Sync Premier League (ID: 39)
    console.log(
      '\n>>> STEP 1: Syncing Competition & Seasons (Premier League ID 39)...',
    );
    const compResult = await compSyncService.syncCompetitionById(39);
    console.log(
      `Competition Synced: ${compResult.name} (ID: ${compResult.competitionId}), Total Seasons: ${compResult.totalSeasons}`,
    );

    // Locate Season 2024
    const season2024 = await seasonRepo.findOne({
      where: {
        competitionId: compResult.competitionId,
        externalId: '2024',
      },
    });

    if (!season2024) {
      throw new Error('Season 2024 not found after competition sync!');
    }
    console.log(
      `Target Season: 2024 (ID: ${season2024.id}, Code: ${season2024.seasonCode})`,
    );

    // STEP 2: Sync Teams for Season 2024
    console.log('\n>>> STEP 2: Syncing Teams for Season 2024...');
    const teamResult = await teamSyncService.syncTeamsByCompetition(
      39,
      2024,
      season2024.id,
    );
    console.log(
      `Teams Synced: ${teamResult.successful}/${teamResult.totalRequested} teams successfully persisted & linked to season_teams`,
    );

    // STEP 3: Sync Squad Players for all 20 Teams
    console.log('\n>>> STEP 3: Syncing Squad Players & Positions for Teams...');
    let totalPlayers = 0;
    let totalPositions = 0;
    let totalHistory = 0;

    // Sync squads for the first 5 teams (to respect API rate limit while proving the slice completely)
    const teamsToSync = teamResult.results.slice(0, 5);
    for (const t of teamsToSync) {
      console.log(`Syncing squad for ${t.teamName} (${t.externalId})...`);
      const pRes = await playerSyncService.syncSquadForTeam(
        t.teamId,
        t.externalId,
      );
      totalPlayers += pRes.persistedPlayers;
      totalPositions += pRes.positionsPersisted;
      totalHistory += pRes.historyPersisted;
    }
    console.log(
      `Squad Sync Finished: ${totalPlayers} players, ${totalPositions} positions, ${totalHistory} history records persisted`,
    );

    // STEP 4: Sync Fixtures (Round 1)
    console.log(
      '\n>>> STEP 4: Syncing Fixtures for Season 2024 (Regular Season - 1)...',
    );
    const matchResult = await matchSyncService.syncMatchesByCompetition(
      compResult.competitionId,
      season2024.id,
      39,
      2024,
      'Regular Season - 1',
    );
    console.log(
      `Matches Synced: ${matchResult.successful}/${matchResult.totalRequested} fixtures persisted`,
    );

    // STEP 5: Sync Player Match Statistics for finished matches
    console.log('\n>>> STEP 5: Syncing Player Match Statistics...');
    let totalStatsPersisted = 0;
    const finishedMatches = matchResult.results.filter(
      (m) => m.status === 'FINISHED',
    );
    console.log(
      `Found ${finishedMatches.length} finished matches in Round 1. Syncing stats for first 2 matches...`,
    );

    for (const m of finishedMatches.slice(0, 2)) {
      console.log(
        `Syncing stats for fixture ${m.externalId} (Match ID: ${m.matchId})...`,
      );
      const statRes = await matchStatsSyncService.syncStatisticsByFixtureId(
        m.externalId,
        m.matchId,
      );
      totalStatsPersisted += statRes.persistedCount;
      console.log(
        `  Fixture ${m.externalId}: ${statRes.persistedCount} player stats persisted (unresolved: ${statRes.unresolvedPlayers})`,
      );
    }

    // STEP 6: Run Season Statistics Aggregation
    console.log('\n>>> STEP 6: Running Season Statistics Aggregation...');
    const aggResult = await seasonAggService.aggregateAllForSeason(
      season2024.id,
      compResult.competitionId,
    );
    console.log(
      `Season Aggregation Finished: ${aggResult.totalAggregated} player season statistics aggregated!`,
    );

    // STEP 7: Database Verification Summary
    console.log('\n======================================================');
    console.log('=== VERIFICATION: LIVE POSTGRESQL ROW COUNTS ===');
    console.log('======================================================');
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
      const status = count > 0 ? '✓ PASS (>0)' : '✗ FAIL (=0)';
      console.log(
        `${table.padEnd(28)}: ${String(count).padStart(5)} rows  ${status}`,
      );
    }

    // Inspect Goalkeeper sample
    console.log('\n--- SAMPLE GOALKEEPER STATISTICS VERIFICATION ---');
    const gkStats = await dataSource.query(`
      SELECT p.name, pms.minutes_played, pms.rating, pms.saves, pms.goals_conceded, pms.clean_sheets, pms.penalties_saved
      FROM player_match_statistics pms
      JOIN players p ON pms.player_id = p.id
      WHERE pms.saves IS NOT NULL AND pms.saves > 0
      LIMIT 5
    `);
    console.table(gkStats);

    console.log('\n=== VERTICAL SLICE SYNC COMPLETED SUCCESSFULLY! ===\n');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during sync script:', err);
  process.exit(1);
});
