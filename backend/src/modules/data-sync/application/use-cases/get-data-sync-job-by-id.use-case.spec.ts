import { NotFoundException } from '@nestjs/common';
import { GetDataSyncJobByIdUseCase } from './get-data-sync-job-by-id.use-case';
import { DataSyncJobRepository } from '../ports/data-sync-job.repository';
import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';
import { SyncLogLevel } from '../../domain/enums/sync-log-level.enum';

describe('GetDataSyncJobByIdUseCase (Unit Tests)', () => {
  let useCase: GetDataSyncJobByIdUseCase;
  let mockJobRepo: jest.Mocked<DataSyncJobRepository>;

  beforeEach(() => {
    mockJobRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findActiveJob: jest.fn(),
      listJobs: jest.fn(),
    };

    useCase = new GetDataSyncJobByIdUseCase(mockJobRepo);
  });

  it('should return mapped job result with logs', async () => {
    mockJobRepo.findById.mockResolvedValueOnce({
      id: 'job-1',
      initiatedBy: 'user-1',
      user: { fullName: 'Admin User' },
      competitionId: 'comp-1',
      competition: { name: 'Premier League' },
      seasonId: 'season-1',
      season: { seasonCode: '2025-2026' },
      provider: 'FOOTBALL_DATA_ORG',
      status: SyncJobStatus.SUCCESS,
      triggerType: SyncTriggerType.MANUAL,
      scope: SyncScope.SEASON,
      target: SyncTarget.FULL,
      mode: SyncMode.REFRESH,
      processedCount: 380,
      createdCount: 380,
      updatedCount: 0,
      failedCount: 0,
      startedAt: new Date('2026-08-29T10:00:00Z'),
      completedAt: new Date('2026-08-29T10:05:00Z'),
      errorMessage: null,
      metadata: null,
      createdAt: new Date('2026-08-29T10:00:00Z'),
      updatedAt: new Date('2026-08-29T10:05:00Z'),
      logs: [
        {
          id: 'log-1',
          jobId: 'job-1',
          level: SyncLogLevel.INFO,
          entityType: 'JOB',
          externalId: null,
          message: 'Started job',
          details: null,
          createdAt: new Date('2026-08-29T10:00:01Z'),
        } as any,
      ],
    } as any);

    const result = await useCase.execute('job-1');
    expect(result.id).toBe('job-1');
    expect(result.initiatedByName).toBe('Admin User');
    expect(result.competitionName).toBe('Premier League');
    expect(result.status).toBe(SyncJobStatus.SUCCESS);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].message).toBe('Started job');
  });

  it('should throw NotFoundException when job does not exist', async () => {
    mockJobRepo.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when jobId is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow(NotFoundException);
  });
});
