import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchSyncService } from './match-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import { PersistMatchUseCase } from '../use-cases/persist-match.use-case';
import { ExternalMatchDetailDto, ExternalMatchListDto } from '../../../external-football/infrastructure/dto/external-match.dto';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import {
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
} from '../../../external-football/domain/errors/external-football.errors';

describe('MatchSyncService', () => {
  let service: MatchSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistUseCase: jest.Mocked<PersistMatchUseCase>;

  const mockMatchDetailDto: ExternalMatchDetailDto = {
    id: 327117,
    utcDate: '2026-08-22T19:00:00Z',
    status: 'FINISHED',
    competition: {
      id: 2021,
      name: 'Premier League',
      code: 'PL',
    },
    season: {
      id: 2502,
      startDate: '2026-08-21',
      endDate: '2027-05-30',
    },
    homeTeam: {
      id: 66,
      name: 'Manchester United FC',
    },
    awayTeam: {
      id: 65,
      name: 'Manchester City FC',
    },
    score: {
      fullTime: {
        home: 2,
        away: 1,
      },
    },
  };

  const mockMatchEntity: MatchOrmEntity = {
    id: 'match-uuid-1',
    competitionId: 'comp-uuid-1',
    seasonId: 'season-uuid-1',
    homeTeamId: 'team-home-uuid',
    awayTeamId: 'team-away-uuid',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '327117',
    matchDate: new Date('2026-08-22T19:00:00Z'),
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 1,
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: null as any,
    season: null as any,
    homeTeam: null as any,
    awayTeam: null as any,
    matchStatistics: [],
  };

  beforeEach(() => {
    mockFootballApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn().mockResolvedValue(mockMatchDetailDto),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
      getPlayerMatches: jest.fn(),
    } as any;

    mockPersistUseCase = {
      execute: jest.fn().mockResolvedValue(mockMatchEntity),
      executeMany: jest.fn(),
    } as any;

    service = new MatchSyncService(
      mockFootballApiClient,
      mockPersistUseCase,
    );
  });

  it('TC-01 & TC-03: should extract match, map to transformed model, and call persist use case', async () => {
    const result = await service.syncMatchById(327117);

    expect(mockFootballApiClient.getMatchById).toHaveBeenCalledWith('327117');
    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '327117',
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
        competitionExternalId: '2021',
        seasonExternalId: '2502',
        homeTeamExternalId: '66',
        awayTeamExternalId: '65',
      }),
    );

    expect(result).toEqual({
      externalId: '327117',
      matchId: 'match-uuid-1',
      homeScore: 2,
      awayScore: 1,
      status: 'FINISHED',
      persistedMatch: mockMatchEntity,
    });
  });

  it('TC-02: should support live match updates through sync', async () => {
    const inPlayDto: ExternalMatchDetailDto = {
      ...mockMatchDetailDto,
      status: 'IN_PLAY',
      score: { fullTime: { home: 1, away: 0 } },
    };
    mockFootballApiClient.getMatchById.mockResolvedValueOnce(inPlayDto);
    mockPersistUseCase.execute.mockResolvedValueOnce({
      ...mockMatchEntity,
      status: 'IN_PLAY',
      homeScore: 1,
      awayScore: 0,
    });

    const result = await service.syncMatchById(327117);
    expect(result.status).toBe('IN_PLAY');
    expect(result.homeScore).toBe(1);
    expect(result.awayScore).toBe(0);
  });

  it('TC-04: should sync scheduled match preserving null scores', async () => {
    const scheduledDto: ExternalMatchDetailDto = {
      ...mockMatchDetailDto,
      status: 'SCHEDULED',
      score: null,
    };
    mockFootballApiClient.getMatchById.mockResolvedValueOnce(scheduledDto);
    mockPersistUseCase.execute.mockResolvedValueOnce({
      ...mockMatchEntity,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    });

    const result = await service.syncMatchById(327117);
    expect(result.status).toBe('SCHEDULED');
    expect(result.homeScore).toBeNull();
    expect(result.awayScore).toBeNull();
  });

  it('TC-05: should sync matches by competition in bulk with Zero N+1 API calls', async () => {
    const mockListDto: ExternalMatchListDto = {
      count: 2,
      matches: [
        mockMatchDetailDto,
        { ...mockMatchDetailDto, id: 327118 },
      ],
    };

    mockFootballApiClient.getMatches.mockResolvedValue(mockListDto);

    const batchResult = await service.syncMatchesByCompetition('PL');

    expect(mockFootballApiClient.getMatches).toHaveBeenCalledWith({
      competitions: 'PL',
    });
    // ZERO N+1: getMatchById is NOT called for each item
    expect(mockFootballApiClient.getMatchById).not.toHaveBeenCalled();
    expect(mockPersistUseCase.execute).toHaveBeenCalledTimes(2);
    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);
  });

  it('TC-06: should sync matches by team', async () => {
    const mockListDto: ExternalMatchListDto = {
      count: 1,
      matches: [mockMatchDetailDto],
    };
    mockFootballApiClient.getMatches.mockResolvedValue(mockListDto);

    const result = await service.syncMatchesByTeam(66);
    expect(mockFootballApiClient.getMatches).toHaveBeenCalled();
    expect(result.successful).toBe(1);
  });

  it('TC-07: should isolate errors in batch sync (Match 1 success, Match 2 fail, Match 3 success)', async () => {
    const mockListDto: ExternalMatchListDto = {
      count: 3,
      matches: [
        { ...mockMatchDetailDto, id: 1 },
        { ...mockMatchDetailDto, id: 2 },
        { ...mockMatchDetailDto, id: 3 },
      ],
    };

    mockFootballApiClient.getMatches.mockResolvedValue(mockListDto);
    mockPersistUseCase.execute
      .mockResolvedValueOnce({ ...mockMatchEntity, id: 'm-1' })
      .mockRejectedValueOnce(new NotFoundException('Team 65 not found in DB'))
      .mockResolvedValueOnce({ ...mockMatchEntity, id: 'm-3' });

    const batchResult = await service.syncMatches({ competitions: 'PL' });

    expect(batchResult.totalRequested).toBe(3);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors[0]).toEqual({
      externalId: '2',
      error: 'Team 65 not found in DB',
    });
  });

  it('TC-08: should propagate ExternalFootballNotFoundError on single match sync 404', async () => {
    mockFootballApiClient.getMatchById.mockRejectedValue(
      new ExternalFootballNotFoundError('Match not found', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncMatchById(999999)).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
  });

  it('TC-09: should propagate ExternalFootballRateLimitError on 429', async () => {
    mockFootballApiClient.getMatchById.mockRejectedValue(
      new ExternalFootballRateLimitError('Rate limit exceeded', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncMatchById(327117)).rejects.toThrow(
      ExternalFootballRateLimitError,
    );
  });

  it('TC-10 & TC-11: should propagate NotFoundException when parent entity is missing', async () => {
    mockPersistUseCase.execute.mockRejectedValue(
      new NotFoundException('Competition with external ID 2021 not found in database'),
    );

    await expect(service.syncMatchById(327117)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('TC-12: should throw BadRequestException on empty match ID', async () => {
    await expect(service.syncMatchById('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-13: should throw BadRequestException on empty competition code', async () => {
    await expect(service.syncMatchesByCompetition('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-14: should throw BadRequestException on empty team ID', async () => {
    await expect(service.syncMatchesByTeam('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('TC-15: should return empty batch result when external API returns empty matches array', async () => {
    mockFootballApiClient.getMatches.mockResolvedValue({ count: 0, matches: [] });

    const batchResult = await service.syncMatches();
    expect(batchResult.totalRequested).toBe(0);
    expect(batchResult.successful).toBe(0);
    expect(batchResult.failed).toBe(0);
    expect(batchResult.results).toEqual([]);
  });

  it('TC-16: should be idempotent on repeated sync calls', async () => {
    await service.syncMatchById(327117);
    await service.syncMatchById(327117);

    expect(mockPersistUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('TC-17: should forward custom provider parameter', async () => {
    await service.syncMatchById(327117, 'CUSTOM_PROVIDER');

    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalProvider: 'CUSTOM_PROVIDER',
      }),
    );
  });

  it('TC-18 & TC-19: should not access database or fetch directly in service', () => {
    expect((service as any).repository).toBeUndefined();
    expect((service as any).dataSource).toBeUndefined();
  });

  it('TC-20: should ignore null/undefined match items in batch gracefully', async () => {
    mockFootballApiClient.getMatches.mockResolvedValue({
      count: 2,
      matches: [null as any, mockMatchDetailDto],
    });

    const result = await service.syncMatches();
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
  });
});
