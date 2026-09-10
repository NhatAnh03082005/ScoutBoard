import {
  Injectable,
  Inject,
  Optional,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DATA_SYNC_JOB_REPOSITORY,
  DataSyncJobRepository,
} from '../ports/data-sync-job.repository';
import {
  DATA_SYNC_LOG_REPOSITORY,
  DataSyncLogRepository,
} from '../ports/data-sync-log.repository';
import { ExecuteAdminSyncCommand } from '../dto/execute-admin-sync.command';
import { ExecuteAdminSyncResult } from '../dto/execute-admin-sync.result';
import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';
import { SyncLogLevel } from '../../domain/enums/sync-log-level.enum';
import { CompetitionOrmEntity } from '../../../competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { MatchOrmEntity } from '../../../matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerSeasonStatisticsAggregationService } from '../../../players/application/services/player-season-statistics-aggregation.service';
import { PlayerEnrichmentSyncService } from '../../../players/application/services/player-enrichment-sync.service';
import { ApiFootballTeamSyncService } from '../../../teams/application/services/api-football-team-sync.service';
import { ApiFootballPlayerSyncService } from '../../../players/application/services/api-football-player-sync.service';
import { ApiFootballMatchSyncService } from '../../../matches/application/services/api-football-match-sync.service';
import { ApiFootballPlayerMatchStatsSyncService } from '../../../matches/application/services/api-football-player-match-stats-sync.service';

@Injectable()
export class ExecuteAdminSyncUseCase {
  private readonly logger = new Logger(ExecuteAdminSyncUseCase.name);

  constructor(
    @Inject(DATA_SYNC_JOB_REPOSITORY)
    private readonly jobRepository: DataSyncJobRepository,
    @Inject(DATA_SYNC_LOG_REPOSITORY)
    private readonly logRepository: DataSyncLogRepository,
    @InjectRepository(CompetitionOrmEntity)
    private readonly competitionRepository: Repository<CompetitionOrmEntity>,
    @InjectRepository(SeasonOrmEntity)
    private readonly seasonRepository: Repository<SeasonOrmEntity>,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepository: Repository<MatchOrmEntity>,
    private readonly playerSeasonAggregationService: PlayerSeasonStatisticsAggregationService,
    @Optional()
    private readonly playerEnrichmentSyncService?: PlayerEnrichmentSyncService,
    @Optional()
    private readonly teamSyncService?: ApiFootballTeamSyncService,
    @Optional()
    private readonly playerSyncService?: ApiFootballPlayerSyncService,
    @Optional()
    private readonly matchSyncService?: ApiFootballMatchSyncService,
    @Optional()
    private readonly playerMatchStatsSyncService?: ApiFootballPlayerMatchStatsSyncService,
  ) {}

  async execute(
    command: ExecuteAdminSyncCommand,
  ): Promise<ExecuteAdminSyncResult> {
    const {
      adminUserId,
      competitionId,
      seasonId,
      scope = SyncScope.SEASON,
      target = SyncTarget.FULL,
      mode = SyncMode.REFRESH,
      triggerType = SyncTriggerType.MANUAL,
      date,
      matchId,
    } = command;

    // 1. Validation: Verify competition and season existence & relationship
    if (!competitionId || String(competitionId).trim() === '') {
      throw new BadRequestException('Competition ID is required');
    }
    if (!seasonId || String(seasonId).trim() === '') {
      throw new BadRequestException('Season ID is required');
    }

    const competition = await this.competitionRepository.findOne({
      where: { id: competitionId },
    });
    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${competitionId} not found`,
      );
    }

    const season = await this.seasonRepository.findOne({
      where: { id: seasonId },
    });
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    if (season.competitionId !== competition.id) {
      throw new BadRequestException(
        `Season ${seasonId} does not belong to Competition ${competitionId}`,
      );
    }

    // 2. Duplicate Active Job Protection
    const activeJob = await this.jobRepository.findActiveJob({
      competitionId,
      seasonId,
    });

    if (activeJob) {
      throw new ConflictException(
        `A sync job is already active for competition ${competitionId} and season ${seasonId} (Job ID: ${activeJob.id}, Status: ${activeJob.status})`,
      );
    }

    // 3. Create Sync Job record in PENDING state
    const job = await this.jobRepository.create({
      initiatedBy: adminUserId || null,
      triggerType,
      competitionId,
      seasonId,
      provider: 'API_FOOTBALL',
      target,
      scope,
      mode,
      status: SyncJobStatus.PENDING,
    });

    this.logger.log(
      `Created Sync Job ${job.id} for Competition: ${competition.name}, Season: ${season.seasonCode} [Target: ${target}, Scope: ${scope}]`,
    );

    // Initial audit log
    await this.logRepository.create({
      jobId: job.id,
      level: SyncLogLevel.INFO,
      entityType: 'JOB',
      message: `Started synchronization job for ${competition.name} (${season.seasonCode}) [Target: ${target}, Scope: ${scope}]`,
      details: { target, scope, mode, startedAt: new Date() },
    });

    // 4. Transition to RUNNING state
    const startedAt = new Date();
    await this.jobRepository.update(job.id, {
      status: SyncJobStatus.RUNNING,
      startedAt,
    });

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let fatalErrorMessage: string | null = null;

    const seasonYear =
      season.externalId ||
      (season.seasonCode ? season.seasonCode.split('-')[0] : '2024');

    try {
      // 5. Execution Pipeline based on Target

      // STAGE 1: Team & SeasonTeams Synchronization
      if (target === SyncTarget.FULL || target === SyncTarget.TEAMS) {
        if (this.teamSyncService) {
          this.logger.log(
            `[Job ${job.id}] Executing Team & SeasonTeam sync via API-Football...`,
          );
          const teamRes = await this.teamSyncService.syncTeamsByCompetition(
            competition.externalId,
            seasonYear,
            season.id,
          );
          totalCreated += teamRes.successful;
          totalFailed += teamRes.failed;
          totalProcessed += teamRes.totalRequested;

          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'TEAM',
            message: `Team sync completed: ${teamRes.successful}/${teamRes.totalRequested} teams persisted and linked to season`,
            details: { successful: teamRes.successful, failed: teamRes.failed },
          });

          // Also sync squad players if playerSyncService is available
          if (this.playerSyncService && teamRes.results.length > 0) {
            this.logger.log(
              `[Job ${job.id}] Executing Squad & Players sync for ${teamRes.results.length} teams...`,
            );
            let totalPlayersSynced = 0;
            for (const t of teamRes.results) {
              const pRes = await this.playerSyncService.syncSquadForTeam(
                t.teamId,
                t.externalId,
              );
              totalPlayersSynced += pRes.persistedPlayers;
            }
            totalCreated += totalPlayersSynced;
            await this.logRepository.create({
              jobId: job.id,
              level: SyncLogLevel.INFO,
              entityType: 'PLAYER',
              message: `Squad sync completed: ${totalPlayersSynced} squad players persisted`,
            });
          }
        } else {
          this.logger.log(
            `[Job ${job.id}] Team & Squad sync target scheduled for API-Football ingestion`,
          );
          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'TEAM',
            message: `Team & Squad sync target prepared for API-Football pipeline`,
          });
        }
      }

      // STAGE 2: Match Synchronization
      if (target === SyncTarget.FULL || target === SyncTarget.MATCHES) {
        if (this.matchSyncService) {
          this.logger.log(
            `[Job ${job.id}] Executing Match sync via API-Football...`,
          );
          const matchRes = await this.matchSyncService.syncMatchesByCompetition(
            competition.id,
            season.id,
            competition.externalId,
            seasonYear,
          );
          totalCreated += matchRes.successful;
          totalFailed += matchRes.failed;
          totalProcessed += matchRes.totalRequested;

          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'MATCH',
            message: `Match sync completed: ${matchRes.successful}/${matchRes.totalRequested} fixtures persisted`,
            details: {
              successful: matchRes.successful,
              failed: matchRes.failed,
            },
          });
        } else {
          this.logger.log(
            `[Job ${job.id}] Match sync target scheduled for API-Football ingestion`,
          );
          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'MATCH',
            message: `Match sync target prepared for API-Football pipeline`,
          });
        }
      }

      // STAGE 2.5: Player Profile Enrichment (API-Football Photos & Physical Data)
      if (
        target === SyncTarget.FULL ||
        target === SyncTarget.PLAYER_ENRICHMENT
      ) {
        if (this.playerEnrichmentSyncService) {
          try {
            this.logger.log(
              `[Job ${job.id}] Executing Player Profile Enrichment (API-Football)...`,
            );

            const seasonTeams = await this.seasonRepository.manager
              .getRepository('SeasonTeamOrmEntity')
              .find({
                where: { seasonId: season.id },
              });

            let totalEnrichedInJob = 0;
            let totalUnmatchedInJob = 0;
            const parsedSeasonYear = parseInt(String(seasonYear), 10);

            for (const st of seasonTeams as any[]) {
              if (!st.teamId) continue;
              try {
                const teamEnrichRes =
                  await this.playerEnrichmentSyncService.enrichPlayersForTeam(
                    st.teamId,
                    isNaN(parsedSeasonYear) ? 2024 : parsedSeasonYear,
                  );
                totalEnrichedInJob += teamEnrichRes.enrichedCount;
                totalUnmatchedInJob += teamEnrichRes.unmatchedCount;
              } catch (teamErr: any) {
                this.logger.warn(
                  `[Job ${job.id}] Team ${st.teamId} enrichment warning: ${teamErr.message}`,
                );
              }
            }

            totalUpdated += totalEnrichedInJob;

            await this.logRepository.create({
              jobId: job.id,
              level: SyncLogLevel.INFO,
              entityType: 'PLAYER',
              message: `Player enrichment completed: ${totalEnrichedInJob} players enriched with photos and physical stats (${totalUnmatchedInJob} unmatched/pending)`,
              details: {
                enrichedCount: totalEnrichedInJob,
                unmatchedCount: totalUnmatchedInJob,
              },
            });
          } catch (err: any) {
            this.logger.warn(
              `[Job ${job.id}] Player enrichment non-fatal warning: ${err.message}`,
            );
            await this.logRepository.create({
              jobId: job.id,
              level: SyncLogLevel.WARN,
              entityType: 'PLAYER',
              message: `Player enrichment non-fatal warning: ${err.message}`,
              details: { error: err.message },
            });
            if (target === SyncTarget.PLAYER_ENRICHMENT) {
              throw err;
            }
          }
        }
      }

      // STAGE 3: Player Match Statistics Synchronization
      if (
        target === SyncTarget.FULL ||
        target === SyncTarget.PLAYER_MATCH_STATISTICS
      ) {
        if (this.playerMatchStatsSyncService) {
          this.logger.log(
            `[Job ${job.id}] Executing Player Match Statistics sync via API-Football...`,
          );

          const matchesToSync = matchId
            ? await this.matchRepository.find({ where: { id: matchId } })
            : await this.matchRepository.find({
                where: { seasonId: season.id, status: 'FINISHED' },
                take: 100,
              });

          let totalStatsPersisted = 0;
          let totalStatsSkipped = 0;

          for (const m of matchesToSync) {
            if (m.externalId) {
              const statRes =
                await this.playerMatchStatsSyncService.syncStatisticsByFixtureId(
                  m.externalId,
                  m.id,
                );
              totalStatsPersisted += statRes.persistedCount;
              totalStatsSkipped += statRes.skippedCount;
            }
          }

          totalCreated += totalStatsPersisted;
          totalProcessed += totalStatsPersisted + totalStatsSkipped;

          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'STATISTICS',
            message: `Player Match Statistics sync completed: ${totalStatsPersisted} player statistics persisted for ${matchesToSync.length} matches`,
            details: {
              totalPersisted: totalStatsPersisted,
              matchesCount: matchesToSync.length,
            },
          });
        } else {
          this.logger.log(
            `[Job ${job.id}] Player Match Statistics sync scheduled for API-Football ingestion`,
          );
          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'STATISTICS',
            message: `Player Match Statistics sync target prepared for API-Football pipeline`,
          });
        }
      }

      // STAGE 4: Season Statistics Aggregation
      if (
        target === SyncTarget.FULL ||
        target === SyncTarget.SEASON_STATISTICS
      ) {
        try {
          this.logger.log(
            `[Job ${job.id}] Executing Season Statistics Aggregation...`,
          );
          const aggregationRes =
            await this.playerSeasonAggregationService.aggregateAllForSeason(
              seasonId,
              competitionId,
            );

          totalProcessed += aggregationRes.totalAggregated;
          totalUpdated += aggregationRes.totalAggregated;

          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.INFO,
            entityType: 'SEASON',
            message: `Season statistics aggregation completed for ${aggregationRes.totalAggregated} players`,
            details: { totalAggregated: aggregationRes.totalAggregated },
          });
        } catch (err: any) {
          totalFailed += 1;
          this.logger.error(
            `[Job ${job.id}] Season statistics aggregation failed: ${err.message}`,
            err.stack,
          );
          await this.logRepository.create({
            jobId: job.id,
            level: SyncLogLevel.ERROR,
            entityType: 'SEASON',
            message: `Season statistics aggregation failed: ${err.message}`,
            details: { error: err.message },
          });
          throw err;
        }
      }
    } catch (err: any) {
      fatalErrorMessage = err.message || 'Unknown sync error';
      this.logger.error(
        `Sync Job ${job.id} failed fatally: ${fatalErrorMessage}`,
        err.stack,
      );
    }

    // 6. Final Status Evaluation
    let finalStatus: SyncJobStatus;
    if (fatalErrorMessage) {
      finalStatus = SyncJobStatus.FAILED;
    } else if (totalFailed > 0 && (totalCreated > 0 || totalUpdated > 0)) {
      finalStatus = SyncJobStatus.PARTIAL_SUCCESS;
    } else if (totalFailed > 0 && totalCreated === 0 && totalUpdated === 0) {
      finalStatus = SyncJobStatus.FAILED;
    } else {
      finalStatus = SyncJobStatus.SUCCESS;
    }

    const completedAt = new Date();
    await this.jobRepository.update(job.id, {
      status: finalStatus,
      processedCount: totalProcessed,
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      failedCount: totalFailed,
      errorMessage: fatalErrorMessage,
      completedAt,
    });

    await this.logRepository.create({
      jobId: job.id,
      level:
        finalStatus === SyncJobStatus.FAILED
          ? SyncLogLevel.ERROR
          : SyncLogLevel.INFO,
      entityType: 'JOB',
      message: `Synchronization job finished with status: ${finalStatus}`,
      details: {
        status: finalStatus,
        processedCount: totalProcessed,
        createdCount: totalCreated,
        updatedCount: totalUpdated,
        failedCount: totalFailed,
        errorMessage: fatalErrorMessage,
        completedAt,
      },
    });

    this.logger.log(
      `Sync Job ${job.id} finalized with status ${finalStatus} (Processed: ${totalProcessed}, Created: ${totalCreated}, Updated: ${totalUpdated}, Failed: ${totalFailed})`,
    );

    return {
      jobId: job.id,
      status: finalStatus,
      scope,
      target,
      mode,
      competitionId,
      seasonId,
      processedCount: totalProcessed,
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      failedCount: totalFailed,
      startedAt,
      completedAt,
      errorMessage: fatalErrorMessage,
    };
  }
}
