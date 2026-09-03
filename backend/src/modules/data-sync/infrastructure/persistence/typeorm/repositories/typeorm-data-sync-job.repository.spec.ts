import { Repository } from 'typeorm';
import { TypeOrmDataSyncJobRepository } from './typeorm-data-sync-job.repository';
import { DataSyncJobOrmEntity } from '../entities/data-sync-job.orm-entity';
import { SyncJobStatus } from '../../../../domain/enums/sync-job-status.enum';
import { SyncTarget } from '../../../../domain/enums/sync-target.enum';
import { SyncScope } from '../../../../domain/enums/sync-scope.enum';
import { NotFoundException } from '@nestjs/common';

describe('TypeOrmDataSyncJobRepository (Unit Tests)', () => {
  let repository: TypeOrmDataSyncJobRepository;
  let mockOrmRepo: jest.Mocked<Repository<DataSyncJobOrmEntity>>;

  beforeEach(() => {
    mockOrmRepo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'job-uuid-1', ...dto })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    repository = new TypeOrmDataSyncJobRepository(mockOrmRepo);
  });

  it('should create a new sync job record', async () => {
    const res = await repository.create({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      target: SyncTarget.FULL,
      scope: SyncScope.SEASON,
    });

    expect(mockOrmRepo.create).toHaveBeenCalled();
    expect(mockOrmRepo.save).toHaveBeenCalled();
    expect(res.competitionId).toBe('comp-uuid-1');
    expect(res.status).toBe(SyncJobStatus.PENDING);
  });

  it('should update job status and counts', async () => {
    mockOrmRepo.findOne.mockResolvedValueOnce({
      id: 'job-uuid-1',
      status: SyncJobStatus.PENDING,
      processedCount: 0,
    } as any);

    const res = await repository.update('job-uuid-1', {
      status: SyncJobStatus.RUNNING,
      processedCount: 10,
    });

    expect(res.status).toBe(SyncJobStatus.RUNNING);
    expect(res.processedCount).toBe(10);
  });

  it('should throw NotFoundException when updating non-existent job', async () => {
    mockOrmRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      repository.update('non-existent', { status: SyncJobStatus.SUCCESS }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should find active job using query builder', async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValueOnce({
        id: 'active-job-1',
        status: SyncJobStatus.RUNNING,
      }),
    };

    mockOrmRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

    const active = await repository.findActiveJob({
      competitionId: 'comp-1',
      seasonId: 'season-1',
      target: SyncTarget.FULL,
    });

    expect(active).toBeDefined();
    expect(active?.id).toBe('active-job-1');
  });

  it('should list jobs with pagination', async () => {
    mockOrmRepo.findAndCount.mockResolvedValueOnce([
      [{ id: 'job-1' } as any, { id: 'job-2' } as any],
      2,
    ]);

    const [jobs, count] = await repository.listJobs(10, 0);
    expect(count).toBe(2);
    expect(jobs).toHaveLength(2);
  });
});
