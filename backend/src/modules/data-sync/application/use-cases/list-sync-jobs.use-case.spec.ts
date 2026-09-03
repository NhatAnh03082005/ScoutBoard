import { ListSyncJobsUseCase } from './list-sync-jobs.use-case';
import { DataSyncJobRepository } from '../ports/data-sync-job.repository';
import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';

describe('ListSyncJobsUseCase (Unit Tests)', () => {
  let useCase: ListSyncJobsUseCase;
  let mockJobRepo: jest.Mocked<DataSyncJobRepository>;

  beforeEach(() => {
    mockJobRepo = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findActiveJob: jest.fn(),
      listJobs: jest.fn(),
    };

    useCase = new ListSyncJobsUseCase(mockJobRepo);
  });

  it('should return paginated list of sync jobs with mapped fields', async () => {
    mockJobRepo.listJobs.mockResolvedValueOnce([
      [
        {
          id: 'job-1',
          initiatedBy: 'admin-uuid-1',
          user: { fullName: 'Super Admin' },
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
          logs: [],
        } as any,
      ],
      1,
    ]);

    const result = await useCase.execute({ limit: 10, offset: 0 });

    expect(result.pagination.total).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.offset).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('job-1');
    expect(result.items[0].initiatedByName).toBe('Super Admin');
    expect(result.items[0].competitionName).toBe('Premier League');
  });

  it('should use default limit and offset if not provided', async () => {
    mockJobRepo.listJobs.mockResolvedValueOnce([[], 0]);

    const result = await useCase.execute();

    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.offset).toBe(0);
    expect(mockJobRepo.listJobs).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      status: undefined,
      competitionId: undefined,
      seasonId: undefined,
    });
  });

  it('should pass status, competitionId, and seasonId filters to repository', async () => {
    mockJobRepo.listJobs.mockResolvedValueOnce([[], 0]);

    await useCase.execute({
      status: SyncJobStatus.RUNNING,
      competitionId: 'comp-1',
      seasonId: 'season-1',
    });

    expect(mockJobRepo.listJobs).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      status: SyncJobStatus.RUNNING,
      competitionId: 'comp-1',
      seasonId: 'season-1',
    });
  });
});
