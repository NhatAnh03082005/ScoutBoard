import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { RoleOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/role.orm-entity';
import { UserRoleOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/user-role.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { DataSyncJobOrmEntity } from '../../modules/data-sync/infrastructure/persistence/typeorm/entities/data-sync-job.orm-entity';
import { DataSyncLogOrmEntity } from '../../modules/data-sync/infrastructure/persistence/typeorm/entities/data-sync-log.orm-entity';
import { JwtService } from '@nestjs/jwt';
import { SyncJobStatus } from '../../modules/data-sync/domain/enums/sync-job-status.enum';

describe('Admin Data Sync REST API Integration Tests (Live PostgreSQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let adminUser: UserOrmEntity;
  let regularUser: UserOrmEntity;
  let adminToken: string;
  let userToken: string;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let logRepo: Repository<DataSyncLogOrmEntity>;
  let jobRepo: Repository<DataSyncJobOrmEntity>;
  let seasonRepo: Repository<SeasonOrmEntity>;
  let compRepo: Repository<CompetitionOrmEntity>;
  let userRoleRepo: Repository<UserRoleOrmEntity>;
  let userRepo: Repository<UserOrmEntity>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean tables
    logRepo = dataSource.getRepository(DataSyncLogOrmEntity);
    jobRepo = dataSource.getRepository(DataSyncJobOrmEntity);
    seasonRepo = dataSource.getRepository(SeasonOrmEntity);
    compRepo = dataSource.getRepository(CompetitionOrmEntity);
    userRoleRepo = dataSource.getRepository(UserRoleOrmEntity);
    const roleRepo = dataSource.getRepository(RoleOrmEntity);
    userRepo = dataSource.getRepository(UserOrmEntity);

    await logRepo.createQueryBuilder().delete().execute();
    await jobRepo.createQueryBuilder().delete().execute();

    // Ensure ADMIN and USER roles exist
    let adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await roleRepo.save(
        roleRepo.create({ code: 'ADMIN', name: 'Administrator' }),
      );
    }

    let userRole = await roleRepo.findOne({ where: { code: 'USER' } });
    if (!userRole) {
      userRole = await roleRepo.save(
        roleRepo.create({ code: 'USER', name: 'Regular User' }),
      );
    }

    // Create Admin User
    adminUser = await userRepo.save(
      userRepo.create({
        email: `admin_api_${Date.now()}@scoutboard.com`,
        passwordHash: '$2b$10$hashedpassadmin1234567890',
        fullName: 'Executive Sync Admin',
        status: 'ACTIVE',
        isEmailVerified: true,
      }),
    );
    await userRoleRepo.save(
      userRoleRepo.create({ userId: adminUser.id, roleId: adminRole.id }),
    );

    // Create Regular User
    regularUser = await userRepo.save(
      userRepo.create({
        email: `user_api_${Date.now()}@scoutboard.com`,
        passwordHash: '$2b$10$hashedpassuser1234567890',
        fullName: 'Regular Scout',
        status: 'ACTIVE',
        isEmailVerified: true,
      }),
    );
    await userRoleRepo.save(
      userRoleRepo.create({ userId: regularUser.id, roleId: userRole.id }),
    );

    // Sign Tokens
    const secret =
      process.env.JWT_SECRET ||
      'scoutboard_jwt_access_secret_key_2026_super_secure';

    adminToken = jwtService.sign(
      {
        sub: adminUser.id,
        email: adminUser.email,
        roles: ['ADMIN'],
      },
      { secret },
    );

    userToken = jwtService.sign(
      {
        sub: regularUser.id,
        email: regularUser.email,
        roles: ['USER'],
      },
      { secret },
    );

    // Create Test Competition & Season
    testComp = await compRepo.save(
      compRepo.create({
        name: 'Premier League',
        type: 'LEAGUE',
        country: 'England',
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: `PL_${Date.now()}`,
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        name: 'Premier League 2025/26',
        seasonCode: '2025-2026',
        startDate: '2025-08-15',
        endDate: '2026-05-25',
        isCurrent: true,
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: `PL_2025_${Date.now()}`,
      }),
    );
  }, 30000);

  afterAll(async () => {
    try {
      if (testComp) {
        const jobs = await jobRepo.find({
          where: { competitionId: testComp.id },
        });
        for (const j of jobs) {
          await logRepo.delete({ jobId: j.id });
          await jobRepo.delete({ id: j.id });
        }
        if (testSeason) {
          await seasonRepo.delete({ id: testSeason.id });
        }

        await compRepo.delete({ id: testComp.id });
      }
      if (adminUser) {
        await userRoleRepo.delete({ userId: adminUser.id });
        await userRepo.delete({ id: adminUser.id });
      }
      if (regularUser) {
        await userRoleRepo.delete({ userId: regularUser.id });
        await userRepo.delete({ id: regularUser.id });
      }
    } catch (err) {
      console.warn('Teardown warning in admin-data-sync-api.spec.ts:', err);
    } finally {
      if (app) {
        await app.close();
      }
    }
  }, 30000);

  it('TC-API-01: should reject unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/data-sync')
      .send({
        competitionId: testComp.id,
        seasonId: testSeason.id,
      });

    expect(res.status).toBe(401);
  });

  it('TC-API-02: should reject non-admin user with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/data-sync')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        competitionId: testComp.id,
        seasonId: testSeason.id,
      });

    expect(res.status).toBe(403);
  });

  it('TC-API-03: should validate request payload and reject invalid UUIDs with 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/data-sync')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        competitionId: 'invalid-not-uuid',
        seasonId: testSeason.id,
      });

    expect(res.status).toBe(400);
  });

  it('TC-API-04: should allow ADMIN to list sync jobs with pagination via GET /api/v1/admin/data-sync/jobs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/data-sync/jobs?limit=10&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.limit).toBe(10);
  });

  it('TC-API-05: should fetch job details via GET /api/v1/admin/data-sync/:id', async () => {
    const jobRepo = dataSource.getRepository(DataSyncJobOrmEntity);
    const createdJob = await jobRepo.save(
      jobRepo.create({
        initiatedBy: adminUser.id,
        competitionId: testComp.id,
        seasonId: testSeason.id,
        status: SyncJobStatus.SUCCESS,
        processedCount: 380,
      }),
    );

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/data-sync/${createdJob.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdJob.id);
    expect(res.body.status).toBe(SyncJobStatus.SUCCESS);
    expect(res.body.initiatedByName).toBe('Executive Sync Admin');
  });

  it('TC-API-06: should return 404 for unknown job UUID', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/data-sync/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('TC-API-07: should return 400 for malformed job UUID', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/data-sync/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  afterAll(async () => {
    try {
      const logRepo = dataSource.getRepository(DataSyncLogOrmEntity);
      const jobRepo = dataSource.getRepository(DataSyncJobOrmEntity);
      const seasonRepo = dataSource.getRepository(SeasonOrmEntity);
      const compRepo = dataSource.getRepository(CompetitionOrmEntity);
      const userRoleRepo = dataSource.getRepository(UserRoleOrmEntity);
      const userRepo = dataSource.getRepository(UserOrmEntity);

      if (testComp) {
        const jobs = await jobRepo.find({
          where: { competitionId: testComp.id },
        });
        for (const j of jobs) {
          await logRepo.delete({ jobId: j.id });
          await jobRepo.delete({ id: j.id });
        }
        if (testSeason) {
          await seasonRepo.delete({ id: testSeason.id });
        }
        await compRepo.delete({ id: testComp.id });
      }

      if (adminUser) {
        await userRoleRepo.delete({ userId: adminUser.id });
        await userRepo.delete({ id: adminUser.id });
      }
      if (regularUser) {
        await userRoleRepo.delete({ userId: regularUser.id });
        await userRepo.delete({ id: regularUser.id });
      }
    } catch (e) {
      console.warn('Cleanup error in admin-data-sync-api.spec.ts:', e);
    } finally {
      await app.close();
    }
  });
});
