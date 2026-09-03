import { Repository } from 'typeorm';
import { TypeOrmDataSyncLogRepository } from './typeorm-data-sync-log.repository';
import { DataSyncLogOrmEntity } from '../entities/data-sync-log.orm-entity';
import { SyncLogLevel } from '../../../../domain/enums/sync-log-level.enum';

describe('TypeOrmDataSyncLogRepository (Unit Tests)', () => {
  let repository: TypeOrmDataSyncLogRepository;
  let mockOrmRepo: jest.Mocked<Repository<DataSyncLogOrmEntity>>;

  beforeEach(() => {
    mockOrmRepo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'log-uuid-1', ...dto })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      find: jest.fn(),
    } as any;

    repository = new TypeOrmDataSyncLogRepository(mockOrmRepo);
  });

  it('should create a single log entry', async () => {
    const res = await repository.create({
      jobId: 'job-uuid-1',
      level: SyncLogLevel.INFO,
      entityType: 'MATCH',
      message: 'Match synced successfully',
    });

    expect(mockOrmRepo.create).toHaveBeenCalled();
    expect(mockOrmRepo.save).toHaveBeenCalled();
    expect(res.message).toBe('Match synced successfully');
    expect(res.level).toBe(SyncLogLevel.INFO);
  });

  it('should create batch log entries', async () => {
    const res = await repository.createBatch([
      {
        jobId: 'job-uuid-1',
        level: SyncLogLevel.INFO,
        message: 'Log 1',
      },
      {
        jobId: 'job-uuid-1',
        level: SyncLogLevel.WARN,
        message: 'Log 2',
      },
    ]);

    expect(mockOrmRepo.save).toHaveBeenCalled();
    expect(res).toHaveLength(2);
  });

  it('should return empty array when createBatch has empty input', async () => {
    const res = await repository.createBatch([]);
    expect(res).toEqual([]);
    expect(mockOrmRepo.save).not.toHaveBeenCalled();
  });

  it('should find logs by job ID ordered by creation time', async () => {
    mockOrmRepo.find.mockResolvedValueOnce([
      { id: 'log-1', message: 'Step 1' } as any,
      { id: 'log-2', message: 'Step 2' } as any,
    ]);

    const logs = await repository.findByJobId('job-uuid-1');
    expect(logs).toHaveLength(2);
    expect(mockOrmRepo.find).toHaveBeenCalledWith({
      where: { jobId: 'job-uuid-1' },
      order: { createdAt: 'ASC' },
    });
  });
});
