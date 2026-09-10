import AppDataSource from '../data-source';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { PersistCompetitionUseCase } from '../../modules/competitions/application/use-cases/persist-competition.use-case';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { PersistSeasonUseCase } from '../../modules/seasons/application/use-cases/persist-season.use-case';
import { PersistCompetitionWithSeasonsUseCase } from '../../modules/competitions/application/use-cases/persist-competition-with-seasons.use-case';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TransformedCompetition } from '../../modules/external-football/domain/models/transformed-competition.model';

describe('Competition & Seasons Persistence Orchestration Integration Test (Live DB)', () => {
  let orchestrator: PersistCompetitionWithSeasonsUseCase;

  const testCompExtId = `test-orch-comp-${Date.now()}`;
  const testSeasonExtId1 = `test-orch-s1-${Date.now()}`;
  const testSeasonExtId2 = `test-orch-s2-${Date.now()}`;
  const testProvider = 'FOOTBALL_DATA_ORG';

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    const persistCompetitionUseCase = new PersistCompetitionUseCase(
      compWriteRepo,
    );

    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    const persistSeasonUseCase = new PersistSeasonUseCase(seasonWriteRepo);

    orchestrator = new PersistCompetitionWithSeasonsUseCase(
      persistCompetitionUseCase,
      persistSeasonUseCase,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      // Clean up test data
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testSeasonExtId1,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testSeasonExtId2,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testCompExtId,
      });

      await AppDataSource.destroy();
    }
  });

  // TC-13 & TC-15: End-to-end Orchestration & Internal UUID Verification in PostgreSQL
  it('TC-13 & TC-15: should persist competition and all child seasons with correct foreign key UUID', async () => {
    const input: TransformedCompetition = {
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Orchestration Test League',
      code: 'OTL',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: 'https://crests.example.com/OTL.png',
      dataUpdatedAt: new Date('2026-08-01T00:00:00Z'),
      currentSeason: {
        externalProvider: testProvider,
        externalId: testSeasonExtId1,
        seasonCode: '2026-2027',
        name: 'Orchestration Test League 2026/27',
        startDate: '2026-08-21',
        endDate: '2027-05-30',
        isCurrent: true,
        currentMatchday: 1,
      },
      seasons: [
        {
          externalProvider: testProvider,
          externalId: testSeasonExtId1,
          seasonCode: '2026-2027',
          name: 'Orchestration Test League 2026/27',
          startDate: '2026-08-21',
          endDate: '2027-05-30',
          isCurrent: true,
          currentMatchday: 1,
        },
        {
          externalProvider: testProvider,
          externalId: testSeasonExtId2,
          seasonCode: '2025-2026',
          name: 'Orchestration Test League 2025/26',
          startDate: '2025-08-15',
          endDate: '2026-05-24',
          isCurrent: false,
          currentMatchday: 38,
        },
      ],
    };

    const result = await orchestrator.execute(input);

    expect(result).toBeDefined();
    expect(result.competitionId).toBeDefined();
    expect(result.seasonsPersisted).toBe(2);
    expect(result.seasons).toHaveLength(2);

    // Direct SQL verification for Competition
    const compRows = await AppDataSource.query(
      `SELECT * FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testCompExtId],
    );
    expect(compRows).toHaveLength(1);
    expect(compRows[0].id).toBe(result.competitionId);

    // Direct SQL verification for Seasons (TC-15: competition_id must be internal UUID)
    const seasonRows = await AppDataSource.query(
      `SELECT * FROM "seasons" WHERE "competition_id" = $1 ORDER BY "season_code" DESC`,
      [result.competitionId],
    );
    expect(seasonRows).toHaveLength(2);
    expect(seasonRows[0].competition_id).toBe(result.competitionId);
    expect(seasonRows[1].competition_id).toBe(result.competitionId);
    expect(seasonRows[0].external_id).toBe(testSeasonExtId1);
    expect(seasonRows[0].is_current).toBe(true);
    expect(seasonRows[1].external_id).toBe(testSeasonExtId2);
    expect(seasonRows[1].is_current).toBe(false);
  });

  // TC-14: Idempotency on consecutive executions
  it('TC-14: should execute idempotently on consecutive runs without duplicating rows', async () => {
    const updatedInput: TransformedCompetition = {
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Orchestration Test League Updated',
      code: 'OTL',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: 'https://crests.example.com/OTL-new.png',
      dataUpdatedAt: new Date('2026-08-25T00:00:00Z'),
      currentSeason: null,
      seasons: [
        {
          externalProvider: testProvider,
          externalId: testSeasonExtId1,
          seasonCode: '2026-2027',
          name: 'Orchestration Test League 2026/27 Renewed',
          startDate: '2026-08-21',
          endDate: '2027-05-30',
          isCurrent: true,
          currentMatchday: 2,
        },
      ],
    };

    // Run multiple times
    const run1 = await orchestrator.execute(updatedInput);
    const run2 = await orchestrator.execute(updatedInput);

    expect(run1.competitionId).toBe(run2.competitionId);

    // Verify row count in PostgreSQL
    const compCount = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testCompExtId],
    );
    expect(compCount[0].count).toBe(1);

    const seasonCount = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "seasons" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testSeasonExtId1],
    );
    expect(seasonCount[0].count).toBe(1);
  });
});
