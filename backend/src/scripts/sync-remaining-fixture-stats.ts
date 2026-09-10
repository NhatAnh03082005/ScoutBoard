import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiFootballPlayerMatchStatsSyncService } from '../modules/matches/application/services/api-football-player-match-stats-sync.service';
import { PlayerSeasonStatisticsAggregationService } from '../modules/players/application/services/player-season-statistics-aggregation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchOrmEntity } from '../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { SeasonOrmEntity } from '../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { CompetitionOrmEntity } from '../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { DataSource } from 'typeorm';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../modules/external-football/application/ports/api-football-client.port';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface QuotaStatus {
  current: number;
  limit: number;
  remaining: number;
  isExhausted: boolean;
  message?: string;
}

async function checkApiFootballQuota(
  apiClient: ApiFootballClientPort,
): Promise<QuotaStatus> {
  try {
    const statusRes: any = await (apiClient as any).request('status');
    if (statusRes?.errors?.requests) {
      return {
        current: 100,
        limit: 100,
        remaining: 0,
        isExhausted: true,
        message: statusRes.errors.requests,
      };
    }
    const current = statusRes?.response?.requests?.current ?? 0;
    const limit = statusRes?.response?.requests?.limit_day ?? 100;
    const remaining = Math.max(0, limit - current);
    return {
      current,
      limit,
      remaining,
      isExhausted: remaining <= 1,
    };
  } catch (err: any) {
    return {
      current: 100,
      limit: 100,
      remaining: 0,
      isExhausted: true,
      message: err.message,
    };
  }
}

async function main() {
  console.log(
    '===============================================================',
  );
  console.log(
    '=== SCOUTBOARD RESUMABLE PLAYER MATCH STATISTICS SYNC ENGINE ==',
  );
  console.log(
    '===============================================================\n',
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const apiClient = app.get<ApiFootballClientPort>(API_FOOTBALL_CLIENT);
    const matchStatsSyncService = app.get(
      ApiFootballPlayerMatchStatsSyncService,
    );
    const seasonAggService = app.get(PlayerSeasonStatisticsAggregationService);

    const compRepo = app.get(getRepositoryToken(CompetitionOrmEntity));
    const seasonRepo = app.get(getRepositoryToken(SeasonOrmEntity));
    const matchRepo = app.get(getRepositoryToken(MatchOrmEntity));

    // 1. Resolve Target Competition & Season
    const comp = await compRepo.findOne({
      where: { externalProvider: 'API_FOOTBALL', externalId: '39' },
    });
    if (!comp) throw new Error('Premier League competition not found!');

    const season = await seasonRepo.findOne({
      where: { competitionId: comp.id, externalId: '2024' },
    });
    if (!season) throw new Error('Premier League 2024 season not found!');

    // 2. Audit Current Statistics Coverage
    const totalMatchesCount = await matchRepo.count({
      where: { competitionId: comp.id, seasonId: season.id },
    });

    const syncedMatchesRows = await dataSource.query(
      `
      SELECT m.id, m.external_id, m.match_date
      FROM matches m
      WHERE m.competition_id = $1 AND m.season_id = $2
        AND EXISTS (SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id)
      ORDER BY m.match_date ASC;
    `,
      [comp.id, season.id],
    );

    const pendingMatchesRows = await dataSource.query(
      `
      SELECT m.id, m.external_id, m.match_date
      FROM matches m
      WHERE m.competition_id = $1 AND m.season_id = $2
        AND NOT EXISTS (SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id)
      ORDER BY m.match_date ASC;
    `,
      [comp.id, season.id],
    );

    const initialStatsRows = await dataSource.query(
      `SELECT count(*) as count FROM player_match_statistics`,
    );
    const initialStatsCount = parseInt(initialStatsRows[0].count, 10);

    const initialPlayersRows = await dataSource.query(
      `SELECT count(distinct player_id) as count FROM player_match_statistics`,
    );
    const initialPlayersCount = parseInt(initialPlayersRows[0].count, 10);

    console.log(`[AUDIT] Total Matches: ${totalMatchesCount}`);
    console.log(
      `[AUDIT] Synced Matches with Stats: ${syncedMatchesRows.length}`,
    );
    console.log(
      `[AUDIT] Pending Matches without Stats: ${pendingMatchesRows.length}`,
    );
    console.log(
      `[AUDIT] Existing Player Match Statistics Rows: ${initialStatsCount}`,
    );
    console.log(`[AUDIT] Unique Players with Stats: ${initialPlayersCount}`);
    console.log(
      `[AUDIT] Current Coverage: ${((syncedMatchesRows.length / totalMatchesCount) * 100).toFixed(2)}%\n`,
    );

    // 3. Check API Quota
    console.log('>>> Checking API-Football status and quota...');
    const quota = await checkApiFootballQuota(apiClient);
    console.log(
      `Quota: ${quota.current}/${quota.limit} requests used today. Remaining: ${quota.remaining}`,
    );

    if (quota.isExhausted) {
      console.warn(
        `\n[QUOTA EXHAUSTED] ${quota.message || 'Daily limit reached (100/100 requests).'}\n` +
          `Free plan limit of 100 requests/day reached. The engine stops safely without triggering 429 errors.\n` +
          `Resumable progress is preserved. Tomorrow, the sync can resume immediately from pending fixture ${pendingMatchesRows[0]?.external_id || 'N/A'}.\n`,
      );
    }

    let newlyPersistedTotal = 0;
    let successfulFixturesThisRun = 0;
    let failedFixturesThisRun = 0;
    let requestsUsedThisRun = 0;
    const retriesCount = 0;
    let tooManyRequestsCount = 0;

    // 4. If quota available, process pending fixtures up to remaining quota
    if (!quota.isExhausted && pendingMatchesRows.length > 0) {
      const batchSize = Math.min(
        pendingMatchesRows.length,
        quota.remaining - 1,
      );
      console.log(
        `>>> Starting batch of ${batchSize} pending fixtures (safe quota buffer: 1 reserve)...`,
      );

      for (let i = 0; i < batchSize; i++) {
        const fixture = pendingMatchesRows[i];
        const fixId = fixture.external_id;
        console.log(
          `[${i + 1}/${batchSize}] Syncing player stats for fixture ${fixId} (Match UUID: ${fixture.id})...`,
        );

        try {
          requestsUsedThisRun++;
          const result = await matchStatsSyncService.syncStatisticsByFixtureId(
            fixId,
            fixture.id,
          );
          newlyPersistedTotal += result.persistedCount;
          successfulFixturesThisRun++;
          console.log(
            `  -> ${result.persistedCount} player stats persisted (skipped: ${result.skippedCount}, unresolved: ${result.unresolvedPlayers}).`,
          );
        } catch (err: any) {
          failedFixturesThisRun++;
          console.error(`  -> Failed to sync fixture ${fixId}: ${err.message}`);
          if (err?.message?.includes('429') || err?.status === 429) {
            tooManyRequestsCount++;
            console.warn('  -> Rate limit hit (429). Stopping batch safely.');
            break;
          }
        }

        if (i < batchSize - 1) {
          console.log('  Waiting 6.5s throttle to prevent rate-limiting...');
          await sleep(6500);
        }
      }

      // Re-aggregate season stats if new stats arrived
      if (newlyPersistedTotal > 0) {
        console.log('\n>>> Re-aggregating Player Season Statistics...');
        const aggRes = await seasonAggService.aggregateAllForSeason(
          season.id,
          comp.id,
        );
        console.log(
          `✓ Aggregation Finished: ${aggRes.totalAggregated} season statistics computed.\n`,
        );
      }
    }

    // 5. Audit Final State & Database Integrity
    const finalStatsRows = await dataSource.query(
      `SELECT count(*) as count FROM player_match_statistics`,
    );
    const finalStatsCount = parseInt(finalStatsRows[0].count, 10);

    const finalPlayersRows = await dataSource.query(
      `SELECT count(distinct player_id) as count FROM player_match_statistics`,
    );
    const finalPlayersCount = parseInt(finalPlayersRows[0].count, 10);

    const finalSeasonStatsRows = await dataSource.query(
      `SELECT count(*) as count FROM player_season_statistics`,
    );
    const finalSeasonStatsCount = parseInt(finalSeasonStatsRows[0].count, 10);

    const finalSyncedMatches = await dataSource.query(`
      SELECT count(distinct match_id) as count FROM player_match_statistics;
    `);
    const completedMatchesCount = parseInt(finalSyncedMatches[0].count, 10);
    const pendingMatchesCount = totalMatchesCount - completedMatchesCount;
    const finalCoverage = (
      (completedMatchesCount / totalMatchesCount) *
      100
    ).toFixed(2);

    // Integrity checks
    const orphanPlayerStats = await dataSource.query(`
      SELECT count(*) as count FROM player_match_statistics pms
      WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.id = pms.player_id);
    `);
    const orphanMatchStats = await dataSource.query(`
      SELECT count(*) as count FROM player_match_statistics pms
      WHERE NOT EXISTS (SELECT 1 FROM matches m WHERE m.id = pms.match_id);
    `);
    const duplicateStats = await dataSource.query(`
      SELECT match_id, player_id, count(*) as count
      FROM player_match_statistics
      GROUP BY match_id, player_id
      HAVING count(*) > 1;
    `);

    console.log('==================================');
    console.log('PLAYER MATCH STATS PROGRESS');
    console.log('==================================');
    console.log(`Total matches:        ${totalMatchesCount}`);
    console.log(`Stats completed:      ${completedMatchesCount}`);
    console.log(`Stats pending:        ${pendingMatchesCount}`);
    console.log(`Stats failed:         ${failedFixturesThisRun}`);
    console.log(`Player Match Stat Rows: ${finalStatsCount}`);
    console.log(`Players With Stats:   ${finalPlayersCount}`);
    console.log(
      `Coverage:             ${completedMatchesCount}/${totalMatchesCount} (${finalCoverage}%)`,
    );
    console.log(`Requests used:        ${requestsUsedThisRun}`);
    console.log(
      `Requests remaining:   ${quota.remaining - requestsUsedThisRun}`,
    );
    console.log(`429:                  ${tooManyRequestsCount}`);
    console.log(`Retries:              ${retriesCount}`);
    console.log(
      `Next fixture:         ${pendingMatchesRows[successfulFixturesThisRun]?.external_id || 'N/A'}`,
    );
    console.log('==================================\n');

    console.log('--- INTEGRITY VERIFICATION ---');
    console.log(
      `Orphan Player Stats:  ${orphanPlayerStats[0].count} (MUST BE 0)`,
    );
    console.log(
      `Orphan Match Stats:   ${orphanMatchStats[0].count} (MUST BE 0)`,
    );
    console.log(`Duplicate Combos:     ${duplicateStats.length} (MUST BE 0)`);

    // Top Goalkeepers check
    const gkResults = await dataSource.query(`
      SELECT 
        p.name as player_name,
        t.name as team_name,
        pss.matches_played,
        pss.saves,
        pss.goals_conceded,
        pss.clean_sheets,
        pss.save_percentage
      FROM player_season_statistics pss
      JOIN players p ON pss.player_id = p.id
      JOIN teams t ON pss.team_id = t.id
      WHERE pss.saves IS NOT NULL AND pss.saves > 0
      ORDER BY pss.saves DESC
      LIMIT 5;
    `);
    console.log('\n--- TOP GOALKEEPERS VERIFIED ---');
    console.table(gkResults);

    await app.close();
  } catch (err: any) {
    console.error('Fatal sync error:', err);
    await app.close();
    process.exit(1);
  }
}

main();
