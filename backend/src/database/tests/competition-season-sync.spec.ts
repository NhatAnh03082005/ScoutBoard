import AppDataSource from '../data-source';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { PersistCompetitionUseCase } from '../../modules/competitions/application/use-cases/persist-competition.use-case';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { PersistSeasonUseCase } from '../../modules/seasons/application/use-cases/persist-season.use-case';
import { PersistCompetitionWithSeasonsUseCase } from '../../modules/competitions/application/use-cases/persist-competition-with-seasons.use-case';
import { CompetitionSeasonSyncService } from '../../modules/competitions/application/services/competition-season-sync.service';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { ExternalCompetitionDetailDto } from '../../modules/external-football/infrastructure/dto/external-competition.dto';

describe('Competition & Season Automatic Sync Service Integration Test (Live DB)', () => {
  let syncService: CompetitionSeasonSyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  const testCompExtId = `sync-comp-${Date.now()}`;
  const testSeasonExtId1 = `sync-s1-${Date.now()}`;
  const testSeasonExtId2 = `sync-s2-${Date.now()}`;
  const testProvider = 'FOOTBALL_DATA_ORG';

  const mockDetailDto: ExternalCompetitionDetailDto = {
    id: testCompExtId as any,
    name: 'Automatic Sync Test League',
    code: 'ASTL',
    type: 'LEAGUE',
    emblem: 'https://crests.football-data.org/ASTL.png',
    area: {
      id: 2072,
      name: 'England',
      code: 'ENG',
      flag: null,
    },
    currentSeason: {
      id: testSeasonExtId1 as any,
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      currentMatchday: 1,
      winner: null,
    },
    seasons: [
      {
        id: testSeasonExtId1 as any,
        startDate: '2026-08-21',
        endDate: '2027-05-30',
        currentMatchday: 1,
        winner: null,
      },
      {
        id: testSeasonExtId2 as any,
        startDate: '2025-08-15',
        endDate: '2026-05-24',
        currentMatchday: 38,
        winner: null,
      },
    ],
    lastUpdated: '2026-08-20T12:00:00Z',
  };

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    const persistCompetitionUseCase = new PersistCompetitionUseCase(compWriteRepo);

    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    const persistSeasonUseCase = new PersistSeasonUseCase(seasonWriteRepo);

    const persistOrchestrator = new PersistCompetitionWithSeasonsUseCase(
      persistCompetitionUseCase,
      persistSeasonUseCase,
    );

    mockApiClient = {
      getCompetitionById: jest.fn().mockResolvedValue(mockDetailDto),
      getCompetitions: jest.fn().mockResolvedValue({ count: 1, competitions: [mockDetailDto as any] }),
      getCompetitionTeams: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPersonById: jest.fn(),
    } as any;

    syncService = new CompetitionSeasonSyncService(
      mockApiClient,
      persistOrchestrator,
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

  it('TC-08: should extract from client, transform, and persist end-to-end into PostgreSQL', async () => {
    const result = await syncService.syncCompetitionById(testCompExtId);

    expect(result).toBeDefined();
    expect(result.externalId).toBe(testCompExtId);
    expect(result.competitionId).toBeDefined();
    expect(result.seasonsPersisted).toBe(2);

    // Direct SQL check in PostgreSQL
    const compRows = await AppDataSource.query(
      `SELECT * FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testCompExtId],
    );
    expect(compRows).toHaveLength(1);
    expect(compRows[0].id).toBe(result.competitionId);
    expect(compRows[0].name).toBe('Automatic Sync Test League');

    const seasonRows = await AppDataSource.query(
      `SELECT * FROM "seasons" WHERE "competition_id" = $1 ORDER BY "season_code" DESC`,
      [result.competitionId],
    );
    expect(seasonRows).toHaveLength(2);
    expect(seasonRows[0].competition_id).toBe(result.competitionId);
    expect(seasonRows[0].external_id).toBe(testSeasonExtId1);
    expect(seasonRows[0].is_current).toBe(true);
    expect(seasonRows[1].external_id).toBe(testSeasonExtId2);
    expect(seasonRows[1].is_current).toBe(false);
  });

  it('TC-09: should execute sync idempotently without duplicating PostgreSQL rows', async () => {
    const run1 = await syncService.syncCompetitionById(testCompExtId);
    const run2 = await syncService.syncCompetitionById(testCompExtId);

    expect(run1.competitionId).toBe(run2.competitionId);

    // Verify row count remains 1 and 2
    const compCount = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "competitions" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testCompExtId],
    );
    expect(compCount[0].count).toBe(1);

    const seasonsCount = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "seasons" WHERE "competition_id" = $1`,
      [run1.competitionId],
    );
    expect(seasonsCount[0].count).toBe(2);
  });
});
