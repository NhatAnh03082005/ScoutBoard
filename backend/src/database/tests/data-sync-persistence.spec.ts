import { DataSource, Repository } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { DataSyncJobOrmEntity } from '../../modules/data-sync/infrastructure/persistence/typeorm/entities/data-sync-job.orm-entity';
import { DataSyncLogOrmEntity } from '../../modules/data-sync/infrastructure/persistence/typeorm/entities/data-sync-log.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { TypeOrmDataSyncJobRepository } from '../../modules/data-sync/infrastructure/persistence/typeorm/repositories/typeorm-data-sync-job.repository';
import { TypeOrmDataSyncLogRepository } from '../../modules/data-sync/infrastructure/persistence/typeorm/repositories/typeorm-data-sync-log.repository';
import { SyncJobStatus } from '../../modules/data-sync/domain/enums/sync-job-status.enum';
import { SyncTarget } from '../../modules/data-sync/domain/enums/sync-target.enum';
import { SyncScope } from '../../modules/data-sync/domain/enums/sync-scope.enum';
import { SyncLogLevel } from '../../modules/data-sync/domain/enums/sync-log-level.enum';

describe('Data Sync Jobs & Logs Persistence Integration Test (Live PostgreSQL)', () => {
  let dataSource: DataSource;
  let jobRepo: TypeOrmDataSyncJobRepository;
  let logRepo: TypeOrmDataSyncLogRepository;
  let rawJobRepo: Repository<DataSyncJobOrmEntity>;
  let rawLogRepo: Repository<DataSyncLogOrmEntity>;
  let compRepo: Repository<CompetitionOrmEntity>;
  let seasonRepo: Repository<SeasonOrmEntity>;
  let userRepo: Repository<UserOrmEntity>;

  let testCompetition: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testAdminUser: UserOrmEntity;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    rawJobRepo = dataSource.getRepository(DataSyncJobOrmEntity);
    rawLogRepo = dataSource.getRepository(DataSyncLogOrmEntity);
    compRepo = dataSource.getRepository(CompetitionOrmEntity);
    seasonRepo = dataSource.getRepository(SeasonOrmEntity);
    userRepo = dataSource.getRepository(UserOrmEntity);

    jobRepo = new TypeOrmDataSyncJobRepository(rawJobRepo);
    logRepo = new TypeOrmDataSyncLogRepository(rawLogRepo);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await rawLogRepo.createQueryBuilder().delete().execute();
      await rawJobRepo.createQueryBuilder().delete().execute();
      if (testSeason?.id) await seasonRepo.delete({ id: testSeason.id });
      if (testCompetition?.id)
        await compRepo.delete({ id: testCompetition.id });
      if (testAdminUser?.id) await userRepo.delete({ id: testAdminUser.id });
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await rawLogRepo.createQueryBuilder().delete().execute();
    await rawJobRepo.createQueryBuilder().delete().execute();

    if (!testAdminUser) {
      testAdminUser = await userRepo.save(
        userRepo.create({
          email: `admin_test_${Date.now()}@scoutboard.com`,
          passwordHash: '$2b$10$hashedpasswordforexecuteadmin1234567890',
          fullName: 'Lead Data Administrator',
          status: 'ACTIVE',
          isEmailVerified: true,
        }),
      );
    }

    if (!testCompetition) {
      testCompetition = await compRepo.save(
        compRepo.create({
          name: 'Premier League Test',
          code: 'PL_TEST',
          type: 'LEAGUE',
          country: 'England',
          externalProvider: 'FOOTBALL_DATA_ORG',
          externalId: `PL_TEST_${Date.now()}`,
        }),
      );
    }

    if (!testSeason) {
      testSeason = await seasonRepo.save(
        seasonRepo.create({
          competitionId: testCompetition.id,
          name: 'Premier League 2025/26 Test',
          seasonCode: '2025-2026',
          startDate: '2025-08-15',
          endDate: '2026-05-25',
          isCurrent: true,
          externalProvider: 'FOOTBALL_DATA_ORG',
          externalId: `PL_2025_TEST_${Date.now()}`,
        }),
      );
    }
  });

  it('TC-INT-01: should persist a new data_sync_jobs record and link to user, competition, and season', async () => {
    const job = await jobRepo.create({
      initiatedBy: testAdminUser.id,
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
      scope: SyncScope.SEASON,
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe(SyncJobStatus.PENDING);
    expect(job.initiatedBy).toBe(testAdminUser.id);
    expect(job.competitionId).toBe(testCompetition.id);
    expect(job.seasonId).toBe(testSeason.id);
  });

  it('TC-INT-02: should update job lifecycle, counts, and timestamps in PostgreSQL', async () => {
    const job = await jobRepo.create({
      initiatedBy: testAdminUser.id,
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    const startedAt = new Date();
    await jobRepo.update(job.id, {
      status: SyncJobStatus.RUNNING,
      startedAt,
    });

    const completedAt = new Date();
    const updated = await jobRepo.update(job.id, {
      status: SyncJobStatus.SUCCESS,
      processedCount: 380,
      createdCount: 380,
      updatedCount: 0,
      failedCount: 0,
      completedAt,
    });

    expect(updated.status).toBe(SyncJobStatus.SUCCESS);
    expect(updated.processedCount).toBe(380);
    expect(updated.startedAt).toBeDefined();
    expect(updated.completedAt).toBeDefined();
  });

  it('TC-INT-03: should find active (RUNNING) job for concurrency duplicate protection', async () => {
    const job = await jobRepo.create({
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    await jobRepo.update(job.id, {
      status: SyncJobStatus.RUNNING,
      startedAt: new Date(),
    });

    const active = await jobRepo.findActiveJob({
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    expect(active).not.toBeNull();
    expect(active?.id).toBe(job.id);
    expect(active?.status).toBe(SyncJobStatus.RUNNING);
  });

  it('TC-INT-04: should create and query data_sync_logs linked to job', async () => {
    const job = await jobRepo.create({
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    await logRepo.create({
      jobId: job.id,
      level: SyncLogLevel.INFO,
      entityType: 'MATCH',
      externalId: 'ext-m-1',
      message: 'Match fixture 1 synced',
      details: { homeScore: 2, awayScore: 1 },
    });

    await logRepo.create({
      jobId: job.id,
      level: SyncLogLevel.WARN,
      entityType: 'STATISTICS',
      message: 'Partial lineup available for match',
    });

    const logs = await logRepo.findByJobId(job.id);
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe(SyncLogLevel.INFO);
    expect(logs[0].message).toBe('Match fixture 1 synced');
    expect(logs[1].level).toBe(SyncLogLevel.WARN);
  });

  it('TC-INT-05: should cascade delete data_sync_logs when parent data_sync_job is deleted', async () => {
    const job = await jobRepo.create({
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    await logRepo.create({
      jobId: job.id,
      level: SyncLogLevel.INFO,
      message: 'Log before cascade test',
    });

    expect(await rawLogRepo.count({ where: { jobId: job.id } })).toBe(1);

    // Delete job
    await rawJobRepo.delete({ id: job.id });

    // Verify logs were cascaded
    expect(await rawLogRepo.count({ where: { jobId: job.id } })).toBe(0);
  });

  it('TC-INT-06: should set initiated_by to NULL if user is deleted (ON DELETE SET NULL)', async () => {
    const job = await jobRepo.create({
      initiatedBy: testAdminUser.id,
      competitionId: testCompetition.id,
      seasonId: testSeason.id,
      target: SyncTarget.FULL,
    });

    expect(job.initiatedBy).toBe(testAdminUser.id);

    // Delete user
    await userRepo.delete({ id: testAdminUser.id });

    const reloaded = await jobRepo.findById(job.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.initiatedBy).toBeNull();
  });
});
