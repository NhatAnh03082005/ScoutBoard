import AppDataSource from '../data-source';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { TransformedSeason } from '../../modules/external-football/domain/models/transformed-competition.model';

describe('Season Persistence & Upsert Integration Test (Live DB)', () => {
  let repository: TypeOrmSeasonWriteRepository;
  let testCompetition: CompetitionOrmEntity;

  const testCompExtId = `test-comp-parent-${Date.now()}`;
  const testSeasonExtId = `test-season-${Date.now()}`;
  const testProvider = 'FOOTBALL_DATA_ORG';

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const ormRepo = AppDataSource.getRepository(SeasonOrmEntity);
    repository = new TypeOrmSeasonWriteRepository(ormRepo);

    // Create a real parent Competition in PostgreSQL
    const compRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    testCompetition = await compRepo.save(
      compRepo.create({
        externalProvider: testProvider,
        externalId: testCompExtId,
        name: 'Parent League For Season Test',
        country: 'England',
        type: 'LEAGUE',
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      // Clean up test child season and parent competition
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testSeasonExtId,
      });
      if (testCompetition) {
        await AppDataSource.getRepository(CompetitionOrmEntity).delete({
          id: testCompetition.id,
        });
      }
      await AppDataSource.destroy();
    }
  });

  it('TC-01 & TC-06: should INSERT new season into PostgreSQL with valid competition_id FK', async () => {
    const input: TransformedSeason = {
      externalProvider: testProvider,
      externalId: testSeasonExtId,
      seasonCode: '2026-2027',
      name: 'Test Season 2026/27',
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      isCurrent: true,
      currentMatchday: 1,
    };

    const persisted = await repository.upsert(input, testCompetition.id);

    expect(persisted).toBeDefined();
    expect(persisted.id).toBeDefined();
    expect(persisted.competitionId).toBe(testCompetition.id);
    expect(persisted.externalProvider).toBe(testProvider);
    expect(persisted.externalId).toBe(testSeasonExtId);
    expect(persisted.seasonCode).toBe('2026-2027');
    expect(persisted.isCurrent).toBe(true);
    expect(persisted.createdAt).toBeDefined();

    // Verify in PostgreSQL table
    const rawCheck = await AppDataSource.query(
      `SELECT * FROM "seasons" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testSeasonExtId],
    );
    expect(rawCheck).toHaveLength(1);
    expect(rawCheck[0].competition_id).toBe(testCompetition.id);
    expect(rawCheck[0].name).toBe('Test Season 2026/27');
  });

  it('TC-02 & TC-03 & TC-08 & TC-09 & TC-11: should UPDATE existing season idempotently preserving id and createdAt', async () => {
    const initialRaw = await AppDataSource.query(
      `SELECT "id", "created_at" FROM "seasons" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testSeasonExtId],
    );
    const initialId = initialRaw[0].id;
    const initialCreatedAt = new Date(initialRaw[0].created_at).getTime();

    const updatedInput: TransformedSeason = {
      externalProvider: testProvider,
      externalId: testSeasonExtId,
      seasonCode: '2026-2027',
      name: 'Test Season 2026/27 Updated',
      startDate: '2026-08-25',
      endDate: '2027-06-01',
      isCurrent: false,
      currentMatchday: 38,
    };

    // Run multiple times
    const run1 = await repository.upsert(updatedInput, testCompetition.id);
    const run2 = await repository.upsert(updatedInput, testCompetition.id);

    expect(run1.id).toBe(initialId);
    expect(run2.id).toBe(initialId);
    expect(run2.name).toBe('Test Season 2026/27 Updated');
    expect(run2.isCurrent).toBe(false);

    // Verify count in PostgreSQL remains 1
    const rawCount = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "seasons" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testSeasonExtId],
    );
    expect(rawCount[0].count).toBe(1);

    // Verify createdAt unchanged
    const afterRaw = await AppDataSource.query(
      `SELECT "created_at" FROM "seasons" WHERE "id" = $1`,
      [initialId],
    );
    expect(new Date(afterRaw[0].created_at).getTime()).toBe(initialCreatedAt);
  });

  it('TC-07 & TC-12: should fail database foreign key constraint when competition_id does not exist', async () => {
    const nonExistentCompId = '00000000-0000-0000-0000-000000000000';
    const invalidInput: TransformedSeason = {
      externalProvider: testProvider,
      externalId: `invalid-comp-season-${Date.now()}`,
      seasonCode: '2026',
      name: 'Invalid FK Season',
      startDate: null,
      endDate: null,
      isCurrent: false,
      currentMatchday: null,
    };

    await expect(repository.upsert(invalidInput, nonExistentCompId)).rejects.toThrow();
  });
});
