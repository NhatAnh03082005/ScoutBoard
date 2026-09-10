import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiFootballPlayerMatchStatsSyncService } from '../modules/matches/application/services/api-football-player-match-stats-sync.service';
import { PlayerSeasonStatisticsAggregationService } from '../modules/players/application/services/player-season-statistics-aggregation.service';
import { DataSource } from 'typeorm';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../modules/external-football/application/ports/api-football-client.port';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getQuota(apiClient: ApiFootballClientPort): Promise<{ current: number; limit: number; remaining: number }> {
  try {
    const res: any = await (apiClient as any).request('status');
    const current = res?.response?.requests?.current ?? 0;
    const limit = res?.response?.requests?.limit_day ?? 100;
    return { current, limit, remaining: Math.max(0, limit - current) };
  } catch (err: any) {
    return { current: 100, limit: 100, remaining: 0 };
  }
}

async function main() {
  console.log('======================================================================');
  console.log('=== SCOUTBOARD: SYNC 41 LA LIGA MATCHES & AGGREGATE PLAYER STATS   ===');
  console.log('======================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const apiClient = app.get<ApiFootballClientPort>(API_FOOTBALL_CLIENT);
  const matchStatsSyncService = app.get(ApiFootballPlayerMatchStatsSyncService);
  const seasonAggService = app.get(PlayerSeasonStatisticsAggregationService);
  const dataSource = app.get(DataSource);

  // 1. Check current quota
  const initialQuota = await getQuota(apiClient);
  console.log(`[API-Football Quota] Current: ${initialQuota.current}/${initialQuota.limit} requests | Remaining: ${initialQuota.remaining}`);

  if (initialQuota.remaining <= 0) {
    console.error('❌ Daily quota is already exhausted. Please try again tomorrow.');
    await app.close();
    return;
  }

  const matchesToFetchCount = Math.min(41, initialQuota.remaining);
  console.log(`Target: Fetching up to ${matchesToFetchCount} top La Liga matches.\n`);

  // 2. Query target matches prioritized by big teams & date
  const candidateMatches: Array<{
    id: string;
    external_id: string;
    match_date: string;
    home: string;
    away: string;
    season_id: string;
    competition_id: string;
  }> = await dataSource.query(`
    SELECT m.id, m.external_id, m.match_date, ht.name as home, at.name as away,
           m.season_id, m.competition_id
    FROM matches m
    JOIN competitions c ON m.competition_id = c.id
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE c.name = 'La Liga'
      AND m.status = 'FINISHED'
      AND NOT EXISTS (
        SELECT 1 FROM player_match_statistics pms WHERE pms.match_id = m.id
      )
    ORDER BY 
      CASE 
        WHEN (ht.name IN ('Real Madrid', 'Barcelona', 'Atletico Madrid') AND at.name IN ('Real Madrid', 'Barcelona', 'Atletico Madrid')) THEN 1
        WHEN (ht.name IN ('Real Madrid', 'Barcelona') OR at.name IN ('Real Madrid', 'Barcelona')) THEN 2
        WHEN (ht.name IN ('Atletico Madrid', 'Athletic Club', 'Villarreal', 'Real Sociedad', 'Girona', 'Real Betis') OR at.name IN ('Atletico Madrid', 'Athletic Club', 'Villarreal', 'Real Sociedad', 'Girona', 'Real Betis')) THEN 3
        ELSE 4
      END ASC,
      m.match_date ASC
    LIMIT $1
  `, [matchesToFetchCount]);

  if (candidateMatches.length === 0) {
    console.log('✓ No matches need syncing. All finished La Liga matches already have stats!');
    await app.close();
    return;
  }

  console.log(`Selected ${candidateMatches.length} matches to synchronize:`);
  candidateMatches.slice(0, 5).forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${new Date(m.match_date).toISOString().slice(0, 10)}] ${m.home} vs ${m.away} (ID: ${m.external_id})`);
  });
  if (candidateMatches.length > 5) {
    console.log(`  ... and ${candidateMatches.length - 5} more matches.`);
  }
  console.log('\nStarting API synchronization (rate limited at ~6.5s per request)...\n');

  let successCount = 0;
  let totalPlayersPersisted = 0;
  let stoppedDueToQuota = false;

  for (let i = 0; i < candidateMatches.length; i++) {
    const match = candidateMatches[i];
    const matchNum = i + 1;
    const dateStr = new Date(match.match_date).toISOString().slice(0, 10);

    process.stdout.write(`[${matchNum}/${candidateMatches.length}] Syncing fixture ${match.external_id} (${match.home} vs ${match.away}, ${dateStr})... `);

    try {
      const result = await matchStatsSyncService.syncStatisticsByFixtureId(match.external_id, match.id);
      successCount++;
      totalPlayersPersisted += result.persistedCount;
      console.log(`✓ OK (${result.persistedCount} player stats, ${result.skippedCount} skipped)`);
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      if (err.message && (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('requests'))) {
        console.warn('⚠️ Quota limit detected. Stopping match sync loop gracefully.');
        stoppedDueToQuota = true;
        break;
      }
    }

    // Delay between requests to adhere to free tier rate limit (< 10 reqs/minute)
    if (i < candidateMatches.length - 1 && !stoppedDueToQuota) {
      await sleep(6500);
    }
  }

  console.log('\n----------------------------------------------------------------------');
  console.log(`✓ Finished Match Sync: ${successCount}/${candidateMatches.length} fixtures synced.`);
  console.log(`✓ Total player match statistic records persisted: ${totalPlayersPersisted}`);
  console.log('----------------------------------------------------------------------\n');

  // 3. Re-aggregate Season Statistics for La Liga
  if (candidateMatches.length > 0 && candidateMatches[0].season_id) {
    const seasonId = candidateMatches[0].season_id;
    const competitionId = candidateMatches[0].competition_id;
    console.log('>>> Aggregating Season Statistics & Per-90 metrics for La Liga 2024-2025...');
    try {
      const aggResult = await seasonAggService.aggregateAllForSeason(seasonId, competitionId);
      console.log(`✓ Aggregation completed: ${aggResult.totalAggregated} players now have updated season stats & Per-90 benchmarks!\n`);
    } catch (aggErr: any) {
      console.error(`⚠️ Season aggregation error: ${aggErr.message}`);
    }
  }

  // 4. Final quota report
  const finalQuota = await getQuota(apiClient);
  console.log('======================================================================');
  console.log(`=== SYNC COMPLETE! Final Quota: ${finalQuota.current}/${finalQuota.limit} requests | Remaining: ${finalQuota.remaining} ===`);
  console.log('======================================================================\n');

  await app.close();
}

main().catch((err) => {
  console.error('Fatal error during sync script:', err);
  process.exit(1);
});
