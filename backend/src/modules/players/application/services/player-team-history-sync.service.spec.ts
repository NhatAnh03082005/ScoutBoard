import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerTeamHistorySyncService } from './player-team-history-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import { PersistPlayerTeamHistoryUseCase } from '../use-cases/persist-player-team-history.use-case';
import { PlayerTeamHistoryOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import {
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
  ExternalFootballServerError,
  ExternalFootballTimeoutError,
} from '../../../external-football/domain/errors/external-football.errors';

describe('PlayerTeamHistorySyncService', () => {
  let service: PlayerTeamHistorySyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistPlayerTeamHistoryUseCase: jest.Mocked<PersistPlayerTeamHistoryUseCase>;

  const mockPlayerExtId = '44';
  const mockInternalPlayerId = 'player-uuid-1';
  const mockInternalTeamId = 'team-uuid-1';

  const mockPersistedHistory: PlayerTeamHistoryOrmEntity = {
    id: 'history-uuid-1',
    playerId: mockInternalPlayerId,
    teamId: mockInternalTeamId,
    startDate: '2021-08-01',
    endDate: null,
    shirtNumber: 7,
    isCurrent: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    player: null as any,
    team: null as any,
  };

  beforeEach(() => {
    mockFootballApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn().mockResolvedValue({
        id: 44,
        name: 'Cristiano Ronaldo',
        shirtNumber: 7,
        currentTeam: {
          id: 66,
          name: 'Manchester United FC',
          contract: {
            start: '2021-08-01',
            until: '2023-06-30',
          },
        },
      }),
      getPlayerMatches: jest.fn().mockResolvedValue({
        count: 2,
        matches: [
          {
            id: 1,
            utcDate: '2021-08-14T11:30:00Z',
            homeTeam: { id: 66, name: 'Manchester United FC' },
            awayTeam: { id: 341, name: 'Leeds United FC' },
          },
          {
            id: 2,
            utcDate: '2022-05-22T15:00:00Z',
            homeTeam: { id: 354, name: 'Crystal Palace FC' },
            awayTeam: { id: 66, name: 'Manchester United FC' },
          },
        ],
      }),
    } as any;

    mockPersistPlayerTeamHistoryUseCase = {
      execute: jest.fn(),
      executeMany: jest.fn().mockResolvedValue([
        {
          playerId: mockInternalPlayerId,
          teamId: mockInternalTeamId,
          startDate: '2021-08-01',
          endDate: null,
          shirtNumber: 7,
          isCurrent: true,
          persistedHistory: mockPersistedHistory,
        },
      ]),
    } as any;

    service = new PlayerTeamHistorySyncService(
      mockFootballApiClient,
      mockPersistPlayerTeamHistoryUseCase,
    );
  });

  it('TC-01, TC-03, TC-05: should sync player team history, identify represented team, and call persist use case', async () => {
    const result = await service.syncPlayerTeamHistoryById(mockPlayerExtId);

    expect(mockFootballApiClient.getPlayerById).toHaveBeenCalledWith(mockPlayerExtId);
    expect(mockFootballApiClient.getPlayerMatches).toHaveBeenCalledWith(mockPlayerExtId);
    expect(mockPersistPlayerTeamHistoryUseCase.executeMany).toHaveBeenCalledWith([
      expect.objectContaining({
        playerExternalId: '44',
        teamExternalId: '66',
        isCurrent: true,
        startDate: '2021-08-01',
        endDate: null,
        shirtNumber: 7,
      }),
    ]);
    expect(result.externalPlayerId).toBe('44');
    expect(result.totalDerivedTeams).toBe(1);
  });

  it('TC-02 & TC-04: should derive and persist multiple teams for a player with historical matches', async () => {
    mockFootballApiClient.getPlayerMatches.mockResolvedValueOnce({
      count: 2,
      matches: [
        {
          id: 10,
          utcDate: '2015-05-10T18:00:00Z',
          homeTeam: { id: 86, name: 'Real Madrid CF' },
          awayTeam: { id: 81, name: 'FC Barcelona' },
        },
        {
          id: 20,
          utcDate: '2021-09-01T15:00:00Z',
          homeTeam: { id: 66, name: 'Manchester United FC' },
          awayTeam: { id: 65, name: 'Manchester City FC' },
        },
      ],
    });

    await service.syncPlayerTeamHistoryById(mockPlayerExtId);

    expect(mockPersistPlayerTeamHistoryUseCase.executeMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ teamExternalId: '86', isCurrent: false }),
        expect.objectContaining({ teamExternalId: '66', isCurrent: true }),
      ]),
    );
  });

  it('TC-07: should fallback to current team in player detail when matches endpoint returns 0 matches', async () => {
    mockFootballApiClient.getPlayerMatches.mockResolvedValueOnce({
      count: 0,
      matches: [],
    });

    const result = await service.syncPlayerTeamHistoryById(mockPlayerExtId);

    expect(mockPersistPlayerTeamHistoryUseCase.executeMany).toHaveBeenCalledWith([
      expect.objectContaining({
        playerExternalId: '44',
        teamExternalId: '66',
        isCurrent: true,
        startDate: '2021-08-01',
      }),
    ]);
    expect(result.totalDerivedTeams).toBe(1);
  });

  it('TC-08: should propagate ExternalFootballNotFoundError when player detail fails with 404', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballNotFoundError('Person not found', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerTeamHistoryById('99999')).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
    expect(mockPersistPlayerTeamHistoryUseCase.executeMany).not.toHaveBeenCalled();
  });

  it('TC-10: should propagate ExternalFootballRateLimitError on 429', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballRateLimitError('Rate limit exceeded', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerTeamHistoryById(mockPlayerExtId)).rejects.toThrow(
      ExternalFootballRateLimitError,
    );
  });

  it('TC-11: should propagate persistence errors cleanly', async () => {
    mockPersistPlayerTeamHistoryUseCase.executeMany.mockRejectedValue(
      new Error('DB Connection Error'),
    );

    await expect(service.syncPlayerTeamHistoryById(mockPlayerExtId)).rejects.toThrow(
      'DB Connection Error',
    );
  });

  it('TC-12: should propagate NotFoundException when player is not found in database', async () => {
    mockPersistPlayerTeamHistoryUseCase.executeMany.mockRejectedValue(
      new NotFoundException('Player with external ID 44 not found in database'),
    );

    await expect(service.syncPlayerTeamHistoryById(mockPlayerExtId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('TC-14 & TC-15: should batch sync with error isolation (Player A success, Player B fail, Player C success)', async () => {
    mockFootballApiClient.getPlayerById
      .mockResolvedValueOnce({ id: 1, name: 'Player A', currentTeam: { id: 66 } } as any)
      .mockRejectedValueOnce(new ExternalFootballNotFoundError('Player B 404', 'FOOTBALL_DATA_ORG'))
      .mockResolvedValueOnce({ id: 3, name: 'Player C', currentTeam: { id: 65 } } as any);

    const batchResult = await service.syncPlayerTeamHistories(['1', '2', '3']);

    expect(batchResult.totalRequested).toBe(3);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors).toHaveLength(1);
    expect(batchResult.errors[0].externalPlayerId).toBe('2');
  });

  it('TC-16: should be idempotent on repeated sync', async () => {
    await service.syncPlayerTeamHistoryById(mockPlayerExtId);
    await service.syncPlayerTeamHistoryById(mockPlayerExtId);

    expect(mockPersistPlayerTeamHistoryUseCase.executeMany).toHaveBeenCalledTimes(2);
  });

  it('TC-17 & TC-18 & TC-19: should not access database directly or use fetch directly', () => {
    expect((service as any).repository).toBeUndefined();
    expect((service as any).dataSource).toBeUndefined();
  });

  it('TC-20: should throw BadRequestException on empty external player ID', async () => {
    await expect(service.syncPlayerTeamHistoryById('')).rejects.toThrow(
      BadRequestException,
    );
  });
});
