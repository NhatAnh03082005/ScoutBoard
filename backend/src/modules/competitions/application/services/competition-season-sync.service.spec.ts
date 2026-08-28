import { BadRequestException } from '@nestjs/common';
import { CompetitionSeasonSyncService } from './competition-season-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import {
  PersistCompetitionWithSeasonsUseCase,
  PersistCompetitionWithSeasonsResult,
} from '../use-cases/persist-competition-with-seasons.use-case';
import { ExternalCompetitionDetailDto, ExternalCompetitionListDto } from '../../../external-football/infrastructure/dto/external-competition.dto';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('CompetitionSeasonSyncService', () => {
  let service: CompetitionSeasonSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistUseCase: jest.Mocked<PersistCompetitionWithSeasonsUseCase>;

  const mockCompetitionDetailDto: ExternalCompetitionDetailDto = {
    id: 2021,
    name: 'Premier League',
    code: 'PL',
    type: 'LEAGUE',
    emblem: 'https://crests.football-data.org/PL.png',
    area: {
      id: 2072,
      name: 'England',
      code: 'ENG',
      flag: 'https://crests.football-data.org/770.svg',
    },
    currentSeason: {
      id: 2502,
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      currentMatchday: 1,
      winner: null,
    },
    seasons: [
      {
        id: 2502,
        startDate: '2026-08-21',
        endDate: '2027-05-30',
        currentMatchday: 1,
        winner: null,
      },
      {
        id: 2403,
        startDate: '2025-08-15',
        endDate: '2026-05-24',
        currentMatchday: 38,
        winner: null,
      },
    ],
    lastUpdated: '2026-08-20T12:00:00Z',
  };

  const mockPersistedCompetition: CompetitionOrmEntity = {
    id: 'internal-uuid-comp-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2021',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date('2026-08-20T12:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const mockPersistedSeasons: SeasonOrmEntity[] = [
    {
      id: 'season-uuid-1',
      competitionId: 'internal-uuid-comp-123',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2502',
      seasonCode: '2026-2027',
      name: 'Premier League 2026-2027',
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      isCurrent: true,
      dataUpdatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      competition: null as any,
      matches: [],
      seasonStatistics: [],
      seasonTeams: [],
    },
    {
      id: 'season-uuid-2',
      competitionId: 'internal-uuid-comp-123',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2403',
      seasonCode: '2025-2026',
      name: 'Premier League 2025-2026',
      startDate: '2025-08-15',
      endDate: '2026-05-24',
      isCurrent: false,
      dataUpdatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      competition: null as any,
      matches: [],
      seasonStatistics: [],
      seasonTeams: [],
    },
  ];

  const mockPersistResult: PersistCompetitionWithSeasonsResult = {
    competitionId: 'internal-uuid-comp-123',
    competition: mockPersistedCompetition,
    seasonsPersisted: 2,
    seasons: mockPersistedSeasons,
  };

  beforeEach(() => {
    mockFootballApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn().mockResolvedValue(mockCompetitionDetailDto),
      getCompetitionTeams: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPersonById: jest.fn(),
    } as any;

    mockPersistUseCase = {
      execute: jest.fn().mockResolvedValue(mockPersistResult),
    } as any;

    service = new CompetitionSeasonSyncService(
      mockFootballApiClient,
      mockPersistUseCase,
    );
  });

  // TC-01: Happy Path Single Competition Sync
  it('TC-01: should extract from client, transform and persist competition with seasons', async () => {
    const result = await service.syncCompetitionById('PL');

    expect(mockFootballApiClient.getCompetitionById).toHaveBeenCalledWith('PL');
    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '2021',
        name: 'Premier League',
        country: 'England',
        type: 'LEAGUE',
        seasons: expect.arrayContaining([
          expect.objectContaining({
            externalId: '2502',
            seasonCode: '2026-2027',
            isCurrent: true,
          }),
          expect.objectContaining({
            externalId: '2403',
            seasonCode: '2025-2026',
            isCurrent: false,
          }),
        ]),
      }),
    );

    expect(result).toEqual({
      externalId: '2021',
      competitionId: 'internal-uuid-comp-123',
      competitionName: 'Premier League',
      seasonsPersisted: 2,
      persistedCompetition: mockPersistedCompetition,
      persistedSeasons: mockPersistedSeasons,
    });
  });

  // TC-02: Batch Sync Competitions
  it('TC-02: should fetch list and sync each competition details sequentially', async () => {
    const mockListDto: ExternalCompetitionListDto = {
      count: 2,
      competitions: [
        {
          id: 2021,
          name: 'Premier League',
          code: 'PL',
          type: 'LEAGUE',
          emblem: '',
          area: { id: 1, name: 'England', code: 'ENG', flag: null },
          currentSeason: null,
          numberOfAvailableSeasons: 1,
          lastUpdated: '',
        },
        {
          id: 2014,
          name: 'La Liga',
          code: 'PD',
          type: 'LEAGUE',
          emblem: '',
          area: { id: 2, name: 'Spain', code: 'ESP', flag: null },
          currentSeason: null,
          numberOfAvailableSeasons: 1,
          lastUpdated: '',
        },
      ],
    };

    mockFootballApiClient.getCompetitions.mockResolvedValue(mockListDto);
    mockFootballApiClient.getCompetitionById
      .mockResolvedValueOnce(mockCompetitionDetailDto)
      .mockResolvedValueOnce({
        ...mockCompetitionDetailDto,
        id: 2014,
        name: 'La Liga',
        code: 'PD',
      });

    const batchResult = await service.syncCompetitions({ plan: 'TIER_ONE' });

    expect(mockFootballApiClient.getCompetitions).toHaveBeenCalledWith({ plan: 'TIER_ONE' });
    expect(mockFootballApiClient.getCompetitionById).toHaveBeenCalledTimes(2);
    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);
    expect(batchResult.results).toHaveLength(2);
    expect(batchResult.errors).toHaveLength(0);
  });

  // TC-03: Client Error Propagation in Single Sync
  it('TC-03: should propagate client exceptions (e.g. 404 or network failure)', async () => {
    mockFootballApiClient.getCompetitionById.mockRejectedValue(
      new Error('API rate limit exceeded (HTTP 429)'),
    );

    await expect(service.syncCompetitionById('PL')).rejects.toThrow(
      'API rate limit exceeded (HTTP 429)',
    );
    expect(mockPersistUseCase.execute).not.toHaveBeenCalled();
  });

  // TC-04: Persistence Error Propagation in Single Sync
  it('TC-04: should propagate persistence exceptions without swallowing', async () => {
    mockPersistUseCase.execute.mockRejectedValue(
      new Error('PostgreSQL unique constraint violation'),
    );

    await expect(service.syncCompetitionById(2021)).rejects.toThrow(
      'PostgreSQL unique constraint violation',
    );
  });

  // TC-05: Partial Failure Isolation in Batch Sync
  it('TC-05: should isolate failures in batch sync without crashing the entire batch', async () => {
    const mockListDto: ExternalCompetitionListDto = {
      count: 2,
      competitions: [
        {
          id: 2021,
          name: 'Premier League',
          code: 'PL',
          type: 'LEAGUE',
          emblem: '',
          area: { id: 1, name: 'England', code: 'ENG', flag: null },
          currentSeason: null,
          numberOfAvailableSeasons: 1,
          lastUpdated: '',
        },
        {
          id: 9999,
          name: 'Unavailable League',
          code: 'UL',
          type: 'LEAGUE',
          emblem: '',
          area: { id: 2, name: 'Unknown', code: 'UNK', flag: null },
          currentSeason: null,
          numberOfAvailableSeasons: 0,
          lastUpdated: '',
        },
      ],
    };

    mockFootballApiClient.getCompetitions.mockResolvedValue(mockListDto);
    mockFootballApiClient.getCompetitionById
      .mockResolvedValueOnce(mockCompetitionDetailDto)
      .mockRejectedValueOnce(new Error('Resource not found (HTTP 404)'));

    const batchResult = await service.syncCompetitions();

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(1);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.results).toHaveLength(1);
    expect(batchResult.errors).toHaveLength(1);
    expect(batchResult.errors[0]).toEqual({
      externalId: '9999',
      error: 'Resource not found (HTTP 404)',
    });
  });

  // TC-06: Validation on Empty Input
  it('TC-06: should throw BadRequestException if idOrCode is missing', async () => {
    await expect(service.syncCompetitionById('')).rejects.toThrow(BadRequestException);
    await expect(service.syncCompetitionById(null as any)).rejects.toThrow(BadRequestException);
    await expect(service.syncCompetitionById(undefined as any)).rejects.toThrow(BadRequestException);
  });

  // TC-07: Idempotent Execution
  it('TC-07: should execute idempotently across consecutive runs', async () => {
    const run1 = await service.syncCompetitionById(2021);
    const run2 = await service.syncCompetitionById(2021);

    expect(run1.competitionId).toBe(run2.competitionId);
    expect(run1.seasonsPersisted).toBe(run2.seasonsPersisted);
  });
});
