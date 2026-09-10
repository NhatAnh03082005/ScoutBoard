import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ExecuteAdminSyncUseCase } from './execute-admin-sync.use-case';
import { DataSyncJobRepository } from '../ports/data-sync-job.repository';
import { DataSyncLogRepository } from '../ports/data-sync-log.repository';
import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';
import { SyncLogLevel } from '../../domain/enums/sync-log-level.enum';

describe('ExecuteAdminSyncUseCase (Comprehensive Unit Tests)', () => {
  let useCase: ExecuteAdminSyncUseCase;
  let mockJobRepo: jest.Mocked<DataSyncJobRepository>;
  let mockLogRepo: jest.Mocked<DataSyncLogRepository>;
  let mockCompetitionRepo: any;
  let mockSeasonRepo: any;
  let mockMatchRepo: any;
  let mockPlayerSeasonAggregationService: any;
  let mockPlayerEnrichmentSyncService: any;

  const sampleComp = {
    id: 'comp-uuid-1',
    externalId: 'PL',
    code: 'PL',
    name: 'Premier League',
    externalProvider: 'API_FOOTBALL',
  };

  const sampleSeason = {
    id: 'season-uuid-1',
    competitionId: 'comp-uuid-1',
    seasonCode: '2025-2026',
  };

  beforeEach(() => {
    mockJobRepo = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: 'job-uuid-100',
          ...dto,
          processedCount: 0,
          createdCount: 0,
          updatedCount: 0,
          failedCount: 0,
          startedAt: null,
          completedAt: null,
        }),
      ),
      update: jest.fn().mockImplementation((id, dto) =>
        Promise.resolve({
          id,
          ...dto,
        }),
      ),
      findById: jest.fn(),
      findActiveJob: jest.fn().mockResolvedValue(null),
      listJobs: jest.fn(),
    };

    mockLogRepo = {
      create: jest.fn().mockResolvedValue({ id: 'log-1' } as any),
      createBatch: jest.fn().mockResolvedValue([]),
      findByJobId: jest.fn().mockResolvedValue([]),
    };

    mockCompetitionRepo = {
      findOne: jest.fn().mockResolvedValue(sampleComp),
    };

    mockSeasonRepo = {
      findOne: jest.fn().mockResolvedValue(sampleSeason),
      manager: {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue([]),
        }),
      },
    };

    mockMatchRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'match-1',
          competitionId: 'comp-uuid-1',
          seasonId: 'season-uuid-1',
          matchDate: new Date('2025-08-15T19:00:00Z'),
        },
      ]),
    };

    mockPlayerSeasonAggregationService = {
      aggregateAllForSeason: jest.fn().mockResolvedValue({
        seasonId: 'season-uuid-1',
        competitionId: 'comp-uuid-1',
        totalAggregated: 25,
        results: [],
      }),
    };

    mockPlayerEnrichmentSyncService = {
      enrichPlayersForTeam: jest.fn().mockResolvedValue({
        totalCandidates: 25,
        enrichedCount: 20,
        unmatchedCount: 5,
        failedCount: 0,
        enrichedPlayers: [],
        errors: [],
      }),
    };

    useCase = new ExecuteAdminSyncUseCase(
      mockJobRepo,
      mockLogRepo,
      mockCompetitionRepo,
      mockSeasonRepo,
      mockMatchRepo,
      mockPlayerSeasonAggregationService,
      mockPlayerEnrichmentSyncService,
    );
  });

  // --- 1. JOB CREATION (TC-01 through TC-04) ---
  it('TC-01: should create and execute a FULL season sync job', async () => {
    const res = await useCase.execute({
      adminUserId: 'admin-1',
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.FULL,
      scope: SyncScope.SEASON,
    });

    expect(mockJobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatedBy: 'admin-1',
        competitionId: 'comp-uuid-1',
        seasonId: 'season-uuid-1',
        target: SyncTarget.FULL,
        scope: SyncScope.SEASON,
        status: SyncJobStatus.PENDING,
      }),
    );
    expect(res.status).toBe(SyncJobStatus.SUCCESS);
    expect(
      mockPlayerSeasonAggregationService.aggregateAllForSeason,
    ).toHaveBeenCalled();
  });

  it('TC-02: should create and execute a MATCHES-only sync job', async () => {
    const res = await useCase.execute({
      adminUserId: 'admin-1',
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.MATCHES,
    });

    expect(res.target).toBe(SyncTarget.MATCHES);
    expect(res.status).toBe(SyncJobStatus.SUCCESS);
    expect(
      mockPlayerSeasonAggregationService.aggregateAllForSeason,
    ).not.toHaveBeenCalled();
  });

  it('TC-03: should create and execute a PLAYER_MATCH_STATISTICS job', async () => {
    const res = await useCase.execute({
      adminUserId: 'admin-1',
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.PLAYER_MATCH_STATISTICS,
      scope: SyncScope.DATE,
      date: '2025-08-15',
    });

    expect(res.target).toBe(SyncTarget.PLAYER_MATCH_STATISTICS);
    expect(res.status).toBe(SyncJobStatus.SUCCESS);
    expect(
      mockPlayerSeasonAggregationService.aggregateAllForSeason,
    ).not.toHaveBeenCalled();
  });

  it('TC-04: should create and execute a SEASON_STATISTICS job', async () => {
    const res = await useCase.execute({
      adminUserId: 'admin-1',
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.SEASON_STATISTICS,
    });

    expect(res.target).toBe(SyncTarget.SEASON_STATISTICS);
    expect(res.status).toBe(SyncJobStatus.SUCCESS);
    expect(
      mockPlayerSeasonAggregationService.aggregateAllForSeason,
    ).toHaveBeenCalledWith('season-uuid-1', 'comp-uuid-1');
  });

  // --- 2. VALIDATION & BUSINESS RULES (TC-05 through TC-10) ---
  it('TC-05: should throw NotFoundException when competition does not exist', async () => {
    mockCompetitionRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        competitionId: 'unknown-comp',
        seasonId: 'season-uuid-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-06: should throw NotFoundException when season does not exist', async () => {
    mockSeasonRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        competitionId: 'comp-uuid-1',
        seasonId: 'unknown-season',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-07: should throw BadRequestException on season/competition mismatch', async () => {
    mockSeasonRepo.findOne.mockResolvedValueOnce({
      id: 'season-uuid-1',
      competitionId: 'other-comp-uuid',
    });

    await expect(
      useCase.execute({
        competitionId: 'comp-uuid-1',
        seasonId: 'season-uuid-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-08: should handle MATCH scope synchronization', async () => {
    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      scope: SyncScope.MATCH,
      matchId: '18535518',
    });

    expect(res.scope).toBe(SyncScope.MATCH);
    expect(res.status).toBe(SyncJobStatus.SUCCESS);
  });

  it('TC-09: should reject missing competitionId or seasonId', async () => {
    await expect(
      useCase.execute({
        competitionId: '',
        seasonId: 'season-uuid-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-10: should record authenticated adminUserId as initiatedBy', async () => {
    await useCase.execute({
      adminUserId: 'admin-lead-uuid',
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });

    expect(mockJobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatedBy: 'admin-lead-uuid',
      }),
    );
  });

  it('TC-11 & TC-12: should support unassigned/scheduled trigger or authenticated user', async () => {
    await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      triggerType: SyncTriggerType.SCHEDULED,
    });

    expect(mockJobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: SyncTriggerType.SCHEDULED,
        initiatedBy: null,
      }),
    );
  });

  // --- 3. LIFECYCLE STATES (TC-13 through TC-17) ---
  it('TC-13: should transition from PENDING -> RUNNING -> SUCCESS', async () => {
    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });

    expect(res.status).toBe(SyncJobStatus.SUCCESS);
    expect(mockJobRepo.update).toHaveBeenCalledWith(
      'job-uuid-100',
      expect.objectContaining({
        status: SyncJobStatus.RUNNING,
      }),
    );
  });

  it('TC-15: should transition to FAILED when fatal error occurs', async () => {
    mockPlayerSeasonAggregationService.aggregateAllForSeason.mockRejectedValueOnce(
      new Error('Fatal database disk failure'),
    );

    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.SEASON_STATISTICS,
    });

    expect(res.status).toBe(SyncJobStatus.FAILED);
  });

  it('TC-16 & TC-17: should record valid started_at and completed_at timestamps', async () => {
    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });

    expect(mockJobRepo.update).toHaveBeenCalledWith(
      'job-uuid-100',
      expect.objectContaining({
        startedAt: expect.any(Date),
      }),
    );
    expect(mockJobRepo.update).toHaveBeenCalledWith(
      'job-uuid-100',
      expect.objectContaining({
        completedAt: expect.any(Date),
      }),
    );
  });

  // --- 4. ERROR HANDLING & CONFLICTS ---
  it('TC-30: should reject duplicate active job with ConflictException', async () => {
    mockJobRepo.findActiveJob.mockResolvedValueOnce({
      id: 'active-job-999',
      status: SyncJobStatus.RUNNING,
    } as any);

    await expect(
      useCase.execute({
        competitionId: 'comp-uuid-1',
        seasonId: 'season-uuid-1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('TC-31: completed previous job does not block new run', async () => {
    mockJobRepo.findActiveJob.mockResolvedValueOnce(null);

    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });

    expect(res.status).toBe(SyncJobStatus.SUCCESS);
  });

  it('TC-36, TC-37, TC-38: should aggregate counts and preserve audit logs', async () => {
    const res = await useCase.execute({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.SEASON_STATISTICS,
    });

    expect(res.processedCount).toBe(25);
    expect(res.updatedCount).toBe(25);
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        level: SyncLogLevel.INFO,
        entityType: 'JOB',
        message: expect.stringMatching(/started/i),
      }),
    );
  });
});
