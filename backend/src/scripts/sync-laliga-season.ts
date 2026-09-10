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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(
    '===============================================================',
  );
  console.log('=== STARTING FULL DATA SYNC: LA LIGA (2024-2025) ===');
  console.log('=== Budget: ~70-75 requests (Under 100 API limit) ===');
  console.log(
    '===============================================================\n',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  let requestCounter = 0;

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

    // =========================================================================
    // STAGE 1: Sync La Liga (ID: 140) & Seasons (1 Request)
    // =========================================================================
    console.log(
      '>>> [1/5] Syncing La Liga competition & seasons (API-Football ID: 140)...',
    );
    requestCounter++;
    const compResult = await compSyncService.syncCompetitionById(140);
    console.log(
      `✓ Competition: ${compResult.name} (UUID: ${compResult.competitionId}, Total Seasons: ${compResult.totalSeasons})`,
    );
    console.log(`  Requests used so far: ${requestCounter}`);

    const season2024 = await seasonRepo.findOne({
      where: {
        competitionId: compResult.competitionId,
        externalId: '2024',
      },
    });

    if (!season2024) {
      throw new Error('Season 2024 for La Liga not found after sync!');
    }
    console.log(
      `✓ Target Season: 2024-2025 (UUID: ${season2024.id}, Code: ${season2024.seasonCode})\n`,
    );

    await sleep(6500);

    // =========================================================================
    // STAGE 2: Sync 20 Teams of La Liga for Season 2024 (1 Request)
    // =========================================================================
    console.log(
      '>>> [2/5] Syncing all 20 La Liga teams for Season 2024-2025...',
    );
    requestCounter++;
    const teamResult = await teamSyncService.syncTeamsByCompetition(
      140,
      2024,
      season2024.id,
    );
    console.log(
      `✓ Teams Synced: ${teamResult.successful}/${teamResult.totalRequested} clubs (Real Madrid, Barcelona, Atletico, etc.)`,
    );
    console.log(`  Requests used so far: ${requestCounter}\n`);

    await sleep(6500);

    // =========================================================================
    // STAGE 3: Sync Squads & Players for All 20 Clubs (20 Requests)
    // =========================================================================
    console.log(
      `>>> [3/5] Syncing squads and player profiles for all ${teamResult.results.length} teams...`,
    );
    let totalPlayers = 0;
    let totalPositions = 0;

    for (let i = 0; i < teamResult.results.length; i++) {
      const t = teamResult.results[i];
      requestCounter++;
      console.log(
        `  [${i + 1}/${teamResult.results.length}] (${requestCounter} reqs) Syncing squad for ${t.teamName}...`,
      );

      const pRes = await playerSyncService.syncSquadForTeam(
        t.teamId,
        t.externalId,
      );
      totalPlayers += pRes.persistedPlayers;
      totalPositions += pRes.positionsPersisted;

      if (i < teamResult.results.length - 1) {
        await sleep(6500); // 6.5s delay to strictly maintain < 10 reqs/min on free tier
      }
    }
    console.log(
      `✓ Squads Sync Finished: ${totalPlayers} players and ${totalPositions} positions persisted.`,
    );
    console.log(`  Requests used so far: ${requestCounter}\n`);

    await sleep(6500);

    // =========================================================================
    // STAGE 4: Sync All 380 Fixtures of Season 2024 (1 Request)
    // =========================================================================
    console.log('>>> [4/5] Syncing all 380 fixtures of La Liga 2024-2025...');
    requestCounter++;
    const matchResult = await matchSyncService.syncMatchesByCompetition(
      compResult.competitionId,
      season2024.id,
      140,
      2024,
    );
    console.log(
      `✓ Matches Synced: ${matchResult.successful}/${matchResult.totalRequested} fixtures persisted in database.`,
    );
    console.log(`  Requests used so far: ${requestCounter}\n`);

    await sleep(6500);

    // =========================================================================
    // STAGE 5: Sync Match Statistics for Top Matches (~30-40 Requests)
    // =========================================================================
    console.log(
      '>>> [5/5] Backfilling detailed player match statistics for key finished fixtures...',
    );
    const finishedMatches = matchResult.results.filter(
      (m) => m.status === 'FINISHED',
    );
    console.log(`Total finished fixtures: ${finishedMatches.length}.`);

    // Pick top 35 finished fixtures to stay safely under 100 requests limit
    const targetFixtures = finishedMatches.slice(0, 35);
    let totalStatsPersisted = 0;

    for (let i = 0; i < targetFixtures.length; i++) {
      const m = targetFixtures[i];
      requestCounter++;
      console.log(
        `  [${i + 1}/${targetFixtures.length}] (${requestCounter} reqs) Syncing match statistics for fixture ${m.externalId}...`,
      );

      const statRes = await matchStatsSyncService.syncStatisticsByFixtureId(
        m.externalId,
        m.matchId,
      );
      totalStatsPersisted += statRes.persistedCount;

      if (i < targetFixtures.length - 1) {
        await sleep(6500);
      }
    }
    console.log(
      `✓ Match Statistics Finished: ${totalStatsPersisted} player performance records persisted.`,
    );
    console.log(
      `  TOTAL API REQUESTS CONSUMED: ${requestCounter} / 100 (Safe buffer: ${100 - requestCounter} remaining)\n`,
    );

    // =========================================================================
    // STAGE 6: Calculate Full-Season Aggregation (0 API Calls - DB Internal)
    // =========================================================================
    console.log(
      '>>> Running Full-Season Aggregation for La Liga players (0 API requests)...',
    );
    const aggResult = await seasonAggService.aggregateAllForSeason(
      season2024.id,
      compResult.competitionId,
    );
    console.log(
      `✓ Aggregation Finished: ${aggResult.totalAggregated} player season statistics generated.\n`,
    );

    // =========================================================================
    // FINAL AUDIT
    // =========================================================================
    console.log(
      '===============================================================',
    );
    console.log('=== LA LIGA SYNC SUCCESSFUL! DATABASE STATS ===');
    console.log(
      '===============================================================',
    );
    const dbSummary = await dataSource.query(`
      SELECT 
        (SELECT count(*) FROM competitions) as competitions,
        (SELECT count(*) FROM teams) as total_teams,
        (SELECT count(*) FROM players) as total_players,
        (SELECT count(*) FROM matches) as total_matches,
        (SELECT count(*) FROM player_match_statistics) as total_match_stats,
        (SELECT count(*) FROM player_season_statistics) as total_season_stats
    `);
    console.table(dbSummary);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during La Liga sync:', err);
  process.exit(1);
});
