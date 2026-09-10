import { BadRequestException } from '@nestjs/common';
import { PersistCompetitionWithSeasonsUseCase } from './persist-competition-with-seasons.use-case';
import { PersistCompetitionUseCase } from './persist-competition.use-case';
import { PersistSeasonUseCase } from '../../../seasons/application/use-cases/persist-season.use-case';
import { TransformedCompetition } from '../../../external-football/domain/models/transformed-competition.model';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('PersistCompetitionWithSeasonsUseCase', () => {
  let useCase: PersistCompetitionWithSeasonsUseCase;
  let mockPersistCompetitionUseCase: jest.Mocked<PersistCompetitionUseCase>;
  let mockPersistSeasonUseCase: jest.Mocked<PersistSeasonUseCase>;

  const mockCompetitionEntity: CompetitionOrmEntity = {
    id: 'internal-uuid-comp-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2021',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const mockSeasonEntities: SeasonOrmEntity[] = [
    {
      id: 'internal-uuid-season-1',
      competitionId: 'internal-uuid-comp-123',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2502',
      seasonCode: '2026-2027',
      name: 'Premier League 2026/27',
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
      id: 'internal-uuid-season-2',
      competitionId: 'internal-uuid-comp-123',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2403',
      seasonCode: '2025-2026',
      name: 'Premier League 2025/26',
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

  const validTransformedCompetition: TransformedCompetition = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2021',
    name: 'Premier League',
    code: 'PL',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    currentSeason: {
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2502',
      seasonCode: '2026-2027',
      name: 'Premier League 2026/27',
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      isCurrent: true,
      currentMatchday: 1,
    },
    seasons: [
      {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '2502',
        seasonCode: '2026-2027',
        name: 'Premier League 2026/27',
        startDate: '2026-08-21',
        endDate: '2027-05-30',
        isCurrent: true,
        currentMatchday: 1,
      },
      {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '2403',
        seasonCode: '2025-2026',
        name: 'Premier League 2025/26',
        startDate: '2025-08-15',
        endDate: '2026-05-24',
        isCurrent: false,
        currentMatchday: 38,
      },
    ],
  };

  beforeEach(() => {
    mockPersistCompetitionUseCase = {
      execute: jest.fn().mockResolvedValue(mockCompetitionEntity),
    } as any;

    mockPersistSeasonUseCase = {
      execute: jest.fn(),
      executeMany: jest.fn().mockResolvedValue(mockSeasonEntities),
    } as any;

    useCase = new PersistCompetitionWithSeasonsUseCase(
      mockPersistCompetitionUseCase,
      mockPersistSeasonUseCase,
    );
  });

  // TC-01: Competition Only
  it('TC-01: should persist competition and skip season persistence when seasons array is empty', async () => {
    const payloadWithoutSeasons: TransformedCompetition = {
      ...validTransformedCompetition,
      seasons: [],
    };

    const result = await useCase.execute(payloadWithoutSeasons);

    expect(result.competitionId).toBe('internal-uuid-comp-123');
    expect(result.seasonsPersisted).toBe(0);
    expect(result.seasons).toEqual([]);
    expect(mockPersistCompetitionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockPersistSeasonUseCase.executeMany).not.toHaveBeenCalled();
  });

  // TC-02 & TC-10: Competition + Seasons & Strict Ordering
  it('TC-02 & TC-10: should persist competition FIRST and then persist seasons with the internal competition ID', async () => {
    const callOrder: string[] = [];
    mockPersistCompetitionUseCase.execute.mockImplementation(async () => {
      callOrder.push('persistCompetition');
      return mockCompetitionEntity;
    });
    mockPersistSeasonUseCase.executeMany.mockImplementation(async () => {
      callOrder.push('persistSeasons');
      return mockSeasonEntities;
    });

    const result = await useCase.execute(validTransformedCompetition);

    expect(callOrder).toEqual(['persistCompetition', 'persistSeasons']);
    expect(result.competitionId).toBe('internal-uuid-comp-123');
    expect(result.seasonsPersisted).toBe(2);
    expect(result.seasons).toEqual(mockSeasonEntities);
  });

  // TC-03: Correct Competition Internal UUID (not external ID)
  it('TC-03: should pass the internal database UUID of the competition to season persistence, NEVER the externalId', async () => {
    await useCase.execute(validTransformedCompetition);

    expect(mockPersistSeasonUseCase.executeMany).toHaveBeenCalledWith(
      validTransformedCompetition.seasons,
      'internal-uuid-comp-123',
    );
    expect(mockPersistSeasonUseCase.executeMany).not.toHaveBeenCalledWith(
      expect.anything(),
      '2021',
    );
  });

  // TC-04: Competition Failure
  it('TC-04: should abort and not call season persistence when competition persistence fails', async () => {
    const error = new Error('Competition persistence DB failed');
    mockPersistCompetitionUseCase.execute.mockRejectedValue(error);

    await expect(useCase.execute(validTransformedCompetition)).rejects.toThrow(
      'Competition persistence DB failed',
    );
    expect(mockPersistSeasonUseCase.executeMany).not.toHaveBeenCalled();
  });

  // TC-05: Season Failure
  it('TC-05: should propagate error cleanly when season persistence fails without masking failure', async () => {
    const seasonError = new Error('Season persistence constraint violation');
    mockPersistSeasonUseCase.executeMany.mockRejectedValue(seasonError);

    await expect(useCase.execute(validTransformedCompetition)).rejects.toThrow(
      'Season persistence constraint violation',
    );
  });

  // TC-06: Empty / Undefined Seasons
  it('TC-06: should handle undefined seasons array gracefully', async () => {
    const payload = {
      ...validTransformedCompetition,
      seasons: undefined as any,
    };
    const result = await useCase.execute(payload);

    expect(result.competitionId).toBe('internal-uuid-comp-123');
    expect(result.seasonsPersisted).toBe(0);
    expect(result.seasons).toEqual([]);
    expect(mockPersistSeasonUseCase.executeMany).not.toHaveBeenCalled();
  });

  // TC-07: Multiple Seasons Forwarding
  it('TC-07: should forward all transformed seasons to season use case', async () => {
    await useCase.execute(validTransformedCompetition);

    expect(mockPersistSeasonUseCase.executeMany).toHaveBeenCalledWith(
      validTransformedCompetition.seasons,
      'internal-uuid-comp-123',
    );
  });

  // TC-08: Idempotency
  it('TC-08: should produce consistent result structure on multiple executions', async () => {
    const result1 = await useCase.execute(validTransformedCompetition);
    const result2 = await useCase.execute(validTransformedCompetition);

    expect(result1.competitionId).toBe(result2.competitionId);
    expect(result1.seasonsPersisted).toBe(result2.seasonsPersisted);
  });

  // TC-09: Input Validation
  it('TC-09: should reject invalid transformed competition payload', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      useCase.execute({ ...validTransformedCompetition, externalProvider: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...validTransformedCompetition, externalId: '  ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...validTransformedCompetition, name: '' }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-11 & TC-12: Transformed Competition Compatibility & isCurrent Preservation
  it('TC-11 & TC-12: should seamlessly accept valid TransformedCompetition and preserve isCurrent flag', async () => {
    const mapped: TransformedCompetition = {
      externalProvider: 'API_FOOTBALL',
      externalId: '39',
      name: 'Premier League',
      code: 'PL',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: null,
      dataUpdatedAt: null,
      currentSeason: null,
      seasons: [
        {
          externalProvider: 'API_FOOTBALL',
          externalId: '2026',
          seasonCode: '2026',
          name: '2026 Season',
          startDate: '2026-08-21',
          endDate: '2027-05-30',
          isCurrent: true,
          dataUpdatedAt: null,
        },
        {
          externalProvider: 'API_FOOTBALL',
          externalId: '2025',
          seasonCode: '2025',
          name: '2025 Season',
          startDate: '2025-08-15',
          endDate: '2026-05-24',
          isCurrent: false,
          dataUpdatedAt: null,
        },
      ],
    };

    const result = await useCase.execute(mapped);

    expect(result.competitionId).toBe('internal-uuid-comp-123');
    expect(mockPersistSeasonUseCase.executeMany).toHaveBeenCalledWith(
      mapped.seasons,
      'internal-uuid-comp-123',
    );
    expect(mapped.seasons[0].isCurrent).toBe(true);
    expect(mapped.seasons[1].isCurrent).toBe(false);
  });
});
