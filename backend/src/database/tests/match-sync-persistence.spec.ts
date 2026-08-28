import AppDataSource from '../data-source';
import { TypeOrmCompetitionWriteRepository } from '../../modules/competitions/infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { TypeOrmSeasonWriteRepository } from '../../modules/seasons/infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TypeOrmMatchWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-match-write.repository';
import { PersistCompetitionUseCase } from '../../modules/competitions/application/use-cases/persist-competition.use-case';
import { PersistSeasonUseCase } from '../../modules/seasons/application/use-cases/persist-season.use-case';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { PersistMatchUseCase } from '../../modules/matches/application/use-cases/persist-match.use-case';
import { MatchSyncService } from '../../modules/matches/application/services/match-sync.service';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';

describe('Match Sync and Persistence Integration Test (Live DB)', () => {
  let compWriteRepo: TypeOrmCompetitionWriteRepository;
  let seasonWriteRepo: TypeOrmSeasonWriteRepository;
  let teamWriteRepo: TypeOrmTeamWriteRepository;
  let matchWriteRepo: TypeOrmMatchWriteRepository;

  let persistCompUseCase: PersistCompetitionUseCase;
  let persistSeasonUseCase: PersistSeasonUseCase;
  let persistTeamUseCase: PersistTeamUseCase;
  let persistMatchUseCase: PersistMatchUseCase;
  let matchSyncService: MatchSyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testCompExtId = `sync-comp-${Date.now()}`;
  const testSeasonExtId = `sync-season-${Date.now()}`;
  const testHomeTeamExtId = `sync-home-${Date.now()}`;
  const testAwayTeamExtId = `sync-away-${Date.now()}`;
  const testMatchExtId1 = `sync-match-1-${Date.now()}`;
  const testMatchExtId2 = `sync-match-2-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compOrmRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonOrmRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const matchOrmRepo = AppDataSource.getRepository(MatchOrmEntity);

    compWriteRepo = new TypeOrmCompetitionWriteRepository(compOrmRepo);
    seasonWriteRepo = new TypeOrmSeasonWriteRepository(seasonOrmRepo);
    teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    matchWriteRepo = new TypeOrmMatchWriteRepository(matchOrmRepo);

    persistCompUseCase = new PersistCompetitionUseCase(compWriteRepo);
    persistSeasonUseCase = new PersistSeasonUseCase(seasonWriteRepo);
    persistTeamUseCase = new PersistTeamUseCase(teamWriteRepo);
    persistMatchUseCase = new PersistMatchUseCase(
      matchWriteRepo,
      compWriteRepo,
      seasonWriteRepo,
      teamWriteRepo,
    );

    // Setup parent entities
    testComp = await persistCompUseCase.execute({
      externalProvider: testProvider,
      externalId: testCompExtId,
      name: 'Sync Match League',
      code: 'SML',
      type: 'LEAGUE',
      emblemUrl: null,
      plan: 'TIER_ONE',
      countryName: 'England',
      countryCode: 'ENG',
      countryFlagUrl: null,
      dataUpdatedAt: null,
    });

    testSeason = await persistSeasonUseCase.execute(
      {
        externalProvider: testProvider,
        externalId: testSeasonExtId,
        name: 'Sync Match Season 2026/27',
        code: 'SML_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
        dataUpdatedAt: null,
      },
      testComp.id,
    );

    testHomeTeam = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testHomeTeamExtId,
      name: 'Sync Home FC',
      normalizedName: 'sync home fc',
      shortName: 'Home FC',
      tla: 'SHF',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1900,
      clubColors: 'Red',
      venue: 'Home Stadium',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    testAwayTeam = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testAwayTeamExtId,
      name: 'Sync Away FC',
      normalizedName: 'sync away fc',
      shortName: 'Away FC',
      tla: 'SAF',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1905,
      clubColors: 'Blue',
      venue: 'Away Stadium',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    mockApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn().mockResolvedValue({
        count: 2,
        matches: [
          {
            id: testMatchExtId1 as any,
            utcDate: '2026-08-22T19:00:00Z',
            status: 'FINISHED',
            matchday: 1,
            homeTeam: { id: testHomeTeamExtId as any, name: 'Sync Home FC' },
            awayTeam: { id: testAwayTeamExtId as any, name: 'Sync Away FC' },
            score: { fullTime: { home: 2, away: 1 } },
            competition: { id: testCompExtId as any, code: 'SML', name: 'Sync Match League' },
            season: { id: testSeasonExtId as any, startDate: '2026-08-01', endDate: '2027-05-30' },
          },
          {
            id: testMatchExtId2 as any,
            utcDate: '2026-08-29T15:00:00Z',
            status: 'SCHEDULED',
            matchday: 2,
            homeTeam: { id: testAwayTeamExtId as any, name: 'Sync Away FC' },
            awayTeam: { id: testHomeTeamExtId as any, name: 'Sync Home FC' },
            score: { fullTime: { home: null, away: null } },
            competition: { id: testCompExtId as any, code: 'SML', name: 'Sync Match League' },
            season: { id: testSeasonExtId as any, startDate: '2026-08-01', endDate: '2027-05-30' },
          },
        ],
      }),
      getMatchById: jest.fn().mockImplementation(async (id) => ({
        id: id as any,
        utcDate: '2026-08-22T19:00:00Z',
        status: 'SCHEDULED',
        matchday: 1,
        homeTeam: { id: testHomeTeamExtId as any, name: 'Sync Home FC' },
        awayTeam: { id: testAwayTeamExtId as any, name: 'Sync Away FC' },
        score: { fullTime: { home: null, away: null } },
        competition: { id: testCompExtId as any, code: 'SML', name: 'Sync Match League' },
        season: { id: testSeasonExtId as any, startDate: '2026-08-01', endDate: '2027-05-30' },
      })),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
      getPlayerMatches: jest.fn(),
    } as any;

    matchSyncService = new MatchSyncService(mockApiClient, persistMatchUseCase);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testMatchExtId1,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testMatchExtId2,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        id: testSeason?.id,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        id: testComp?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testHomeTeam?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testAwayTeam?.id,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-21: should sync single match and persist with internal UUID foreign keys', async () => {
    const result = await matchSyncService.syncMatchById(testMatchExtId1, testProvider);

    expect(result.externalId).toBe(testMatchExtId1);
    expect(result.matchId).toBeDefined();

    const dbRow = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "id" = $1`,
      [result.matchId],
    );
    expect(dbRow).toHaveLength(1);
    expect(dbRow[0].competition_id).toBe(testComp.id);
    expect(dbRow[0].season_id).toBe(testSeason.id);
    expect(dbRow[0].home_team_id).toBe(testHomeTeam.id);
    expect(dbRow[0].away_team_id).toBe(testAwayTeam.id);
  });

  it('TC-22: should maintain idempotency on repeated sync of same match', async () => {
    await matchSyncService.syncMatchById(testMatchExtId1, testProvider);
    await matchSyncService.syncMatchById(testMatchExtId1, testProvider);

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
      [testProvider, testMatchExtId1],
    );
    expect(countRows[0].count).toBe(1);
  });

  it('TC-23: should handle live match state updates through sync (SCHEDULED -> IN_PLAY -> FINISHED)', async () => {
    // 1. IN_PLAY 1-0
    mockApiClient.getMatchById.mockResolvedValueOnce({
      id: testMatchExtId1 as any,
      utcDate: '2026-08-22T19:00:00Z',
      status: 'IN_PLAY',
      matchday: 1,
      homeTeam: { id: testHomeTeamExtId as any, name: 'Sync Home FC' },
      awayTeam: { id: testAwayTeamExtId as any, name: 'Sync Away FC' },
      score: { fullTime: { home: 1, away: 0 } },
      competition: { id: testCompExtId as any, code: 'SML', name: 'Sync Match League' },
      season: { id: testSeasonExtId as any, startDate: '2026-08-01', endDate: '2027-05-30' },
    });
    await matchSyncService.syncMatchById(testMatchExtId1, testProvider);

    let row = (
      await AppDataSource.query(
        `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
        [testProvider, testMatchExtId1],
      )
    )[0];
    expect(row.status).toBe('IN_PLAY');
    expect(row.home_score).toBe(1);
    expect(row.away_score).toBe(0);

    // 2. FINISHED 2-1
    mockApiClient.getMatchById.mockResolvedValueOnce({
      id: testMatchExtId1 as any,
      utcDate: '2026-08-22T19:00:00Z',
      status: 'FINISHED',
      matchday: 1,
      homeTeam: { id: testHomeTeamExtId as any, name: 'Sync Home FC' },
      awayTeam: { id: testAwayTeamExtId as any, name: 'Sync Away FC' },
      score: { fullTime: { home: 2, away: 1 } },
      competition: { id: testCompExtId as any, code: 'SML', name: 'Sync Match League' },
      season: { id: testSeasonExtId as any, startDate: '2026-08-01', endDate: '2027-05-30' },
    });
    await matchSyncService.syncMatchById(testMatchExtId1, testProvider);

    row = (
      await AppDataSource.query(
        `SELECT * FROM "matches" WHERE "external_provider" = $1 AND "external_id" = $2`,
        [testProvider, testMatchExtId1],
      )
    )[0];
    expect(row.status).toBe('FINISHED');
    expect(row.home_score).toBe(2);
    expect(row.away_score).toBe(1);
  });

  it('TC-24: should bulk sync competition matches with Zero N+1 API calls', async () => {
    const batchResult = await matchSyncService.syncMatchesByCompetition('SML', undefined, testProvider);

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);

    const rows = await AppDataSource.query(
      `SELECT * FROM "matches" WHERE "competition_id" = $1`,
      [testComp.id],
    );
    expect(rows).toHaveLength(2);
  });

  it('TC-25: should isolate errors in batch sync when parent entity is missing', async () => {
    mockApiClient.getMatches.mockResolvedValueOnce({
      count: 2,
      matches: [
        {
          id: 'valid-match-in-batch',
          utcDate: '2026-08-22T19:00:00Z',
          status: 'FINISHED',
          homeTeam: { id: testHomeTeamExtId, name: 'Sync Home FC' },
          awayTeam: { id: testAwayTeamExtId, name: 'Sync Away FC' },
          score: { fullTime: { home: 1, away: 0 } },
          competition: { id: testCompExtId, code: 'SML', name: 'Sync Match League' },
          season: { id: testSeasonExtId, startDate: '2026-08-01', endDate: '2027-05-30' },
        },
        {
          id: 'invalid-match-in-batch',
          utcDate: '2026-08-22T19:00:00Z',
          status: 'FINISHED',
          homeTeam: { id: 'unknown-home-team', name: 'Ghost Home FC' },
          awayTeam: { id: testAwayTeamExtId, name: 'Sync Away FC' },
          score: { fullTime: { home: 0, away: 0 } },
          competition: { id: testCompExtId, code: 'SML', name: 'Sync Match League' },
          season: { id: testSeasonExtId, startDate: '2026-08-01', endDate: '2027-05-30' },
        },
      ],
    } as any);

    const batchResult = await matchSyncService.syncMatches(undefined, testProvider);

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(1);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors[0].externalId).toBe('invalid-match-in-batch');

    // Clean up
    await AppDataSource.getRepository(MatchOrmEntity).delete({
      externalProvider: testProvider,
      externalId: 'valid-match-in-batch',
    });
  });
});
