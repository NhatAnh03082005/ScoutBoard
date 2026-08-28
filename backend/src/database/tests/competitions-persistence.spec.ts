import AppDataSource from '../data-source';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { TransformedCompetition } from '../../modules/external-football/domain/models/transformed-competition.model';

describe('Competition Persistence & Upsert Integration Test (Live DB)', () => {
  let repository: TypeOrmCompetitionWriteRepository;
  const testExtId = `test-comp-${Date.now()}`;
  const testProvider = 'FOOTBALL_DATA_ORG';

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const ormRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    repository = new TypeOrmCompetitionWriteRepository(ormRepo);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      // Clean up test data
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testExtId,
      });
      await AppDataSource.destroy();
    }
  });

  it('TC-01 & TC-06: should INSERT new competition into PostgreSQL with nullable fields', async () => {
    const input: TransformedCompetition = {
      externalProvider: testProvider,
      externalId: testExtId,
      name: 'Integration Test League',
      code: 'ITL',
      country: 'Testland',
      type: 'LEAGUE',
      logoUrl: 'https://crests.example.com/ITL.png',
      dataUpdatedAt: new Date('2026-08-01T00:00:00Z'),
      currentSeason: null,
      seasons: [],
    };

    const persisted = await repository.upsert(input);

    expect(persisted).toBeDefined();
    expect(persisted.id).toBeDefined();
    expect(persisted.externalProvider).toBe(testProvider);
    expect(persisted.externalId).toBe(testExtId);
    expect(persisted.name).toBe('Integration Test League');
    expect(persisted.country).toBe('Testland');
    expect(persisted.type).toBe('LEAGUE');
    expect(persisted.createdAt).toBeDefined();
    expect(persisted.updatedAt).toBeDefined();

    // Verify directly with raw query
    const rawCheck = await AppDataSource.query(
      `SELECT * FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testExtId],
    );
    expect(rawCheck).toHaveLength(1);
    expect(rawCheck[0].name).toBe('Integration Test League');
  });

  it('TC-02 & TC-03 & TC-08: should UPDATE existing competition idempotently without creating duplicate rows', async () => {
    const updatedInput: TransformedCompetition = {
      externalProvider: testProvider,
      externalId: testExtId,
      name: 'Integration Test League Updated',
      code: 'ITL',
      country: 'Testland Updated',
      type: 'LEAGUE',
      logoUrl: 'https://crests.example.com/ITL-new.png',
      dataUpdatedAt: new Date('2026-08-20T00:00:00Z'),
      currentSeason: null,
      seasons: [],
    };

    // Run multiple times to verify idempotency
    const run1 = await repository.upsert(updatedInput);
    const run2 = await repository.upsert(updatedInput);

    expect(run1.id).toBe(run2.id);
    expect(run2.name).toBe('Integration Test League Updated');
    expect(run2.country).toBe('Testland Updated');
    expect(run2.logoUrl).toBe('https://crests.example.com/ITL-new.png');

    // Verify in database that total count remains exactly 1
    const rawCheck = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testExtId],
    );
    expect(rawCheck[0].count).toBe(1);
  });
});
