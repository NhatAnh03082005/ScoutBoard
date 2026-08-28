import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayerPositionSyncService } from './player-position-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import { PersistPlayerPositionsUseCase } from '../use-cases/persist-player-positions.use-case';
import { PlayerPositionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import {
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
  ExternalFootballServerError,
  ExternalFootballTimeoutError,
} from '../../../external-football/domain/errors/external-football.errors';

describe('PlayerPositionSyncService', () => {
  let service: PlayerPositionSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistPlayerPositionsUseCase: jest.Mocked<PersistPlayerPositionsUseCase>;

  const mockPlayerExtId = '44';
  const mockInternalPlayerId = 'player-uuid-1';

  const mockPersistedPosition: PlayerPositionOrmEntity = {
    id: 'pos-uuid-1',
    playerId: mockInternalPlayerId,
    positionCode: 'ST',
    isPrimary: true,
    player: null as any,
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
        position: 'Centre-Forward',
      }),
    } as any;

    mockPersistPlayerPositionsUseCase = {
      execute: jest.fn().mockResolvedValue({
        playerId: mockInternalPlayerId,
        positionCode: 'ST',
        isPrimary: true,
        persistedPosition: mockPersistedPosition,
      }),
      executeMany: jest.fn(),
    } as any;

    service = new PlayerPositionSyncService(
      mockFootballApiClient,
      mockPersistPlayerPositionsUseCase,
    );
  });

  it('TC-01 & TC-02: should sync one player with valid position (Centre-Forward -> ST PRIMARY)', async () => {
    const result = await service.syncPlayerPositionById(mockPlayerExtId);

    expect(mockFootballApiClient.getPlayerById).toHaveBeenCalledWith(
      mockPlayerExtId,
    );
    expect(mockPersistPlayerPositionsUseCase.execute).toHaveBeenCalledWith({
      playerExternalId: '44',
      externalProvider: 'FOOTBALL_DATA_ORG',
      positionCode: 'ST',
      isPrimary: true,
    });
    expect(result).toEqual({
      externalPlayerId: '44',
      playerId: mockInternalPlayerId,
      positionCode: 'ST',
      isPrimary: true,
      persistedPosition: mockPersistedPosition,
      status: 'SYNCED',
    });
  });

  it('TC-03: should safely handle player without position (null) without calling persist', async () => {
    mockFootballApiClient.getPlayerById.mockResolvedValue({
      id: 44,
      name: 'Player Without Position',
      position: null as any,
    });

    const result = await service.syncPlayerPositionById(mockPlayerExtId);

    expect(mockPersistPlayerPositionsUseCase.execute).not.toHaveBeenCalled();
    expect(result).toEqual({
      externalPlayerId: '44',
      playerId: null,
      positionCode: null,
      isPrimary: false,
      persistedPosition: null,
      status: 'NO_POSITION',
    });
  });

  it('TC-04: should propagate NotFoundException when player is not found internally', async () => {
    mockPersistPlayerPositionsUseCase.execute.mockRejectedValue(
      new NotFoundException('Player not found in database'),
    );

    await expect(service.syncPlayerPositionById('99999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('TC-05: should propagate ExternalFootballNotFoundError on 404', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballNotFoundError('Person 999 not found', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerPositionById('999')).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
  });

  it('TC-06: should propagate ExternalFootballRateLimitError on 429', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballRateLimitError('Rate limit exceeded', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerPositionById(mockPlayerExtId)).rejects.toThrow(
      ExternalFootballRateLimitError,
    );
  });

  it('TC-07: should propagate ExternalFootballServerError on 500', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballServerError('Server error', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerPositionById(mockPlayerExtId)).rejects.toThrow(
      ExternalFootballServerError,
    );
  });

  it('TC-08: should propagate ExternalFootballTimeoutError on timeout', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(
      new ExternalFootballTimeoutError('Request timeout', 'FOOTBALL_DATA_ORG'),
    );

    await expect(service.syncPlayerPositionById(mockPlayerExtId)).rejects.toThrow(
      ExternalFootballTimeoutError,
    );
  });

  it('TC-09: should handle unknown position without calling persist', async () => {
    mockFootballApiClient.getPlayerById.mockResolvedValue({
      id: 44,
      name: 'Player Unknown',
      position: 'UnknownPositionXYZ',
    });

    const result = await service.syncPlayerPositionById(mockPlayerExtId);

    expect(mockPersistPlayerPositionsUseCase.execute).not.toHaveBeenCalled();
    expect(result.status).toBe('NO_POSITION');
  });

  it('TC-10: should propagate persistence errors cleanly in syncPlayerPositionById', async () => {
    mockPersistPlayerPositionsUseCase.execute.mockRejectedValue(
      new Error('DB Connection Error'),
    );

    await expect(service.syncPlayerPositionById(mockPlayerExtId)).rejects.toThrow(
      'DB Connection Error',
    );
  });

  it('TC-11: should batch sync all player positions for a team squad', async () => {
    mockFootballApiClient.getPlayers.mockResolvedValue({
      count: 2,
      players: [
        { id: 44, name: 'Player One', position: 'Centre-Forward' },
        { id: 45, name: 'Player Two', position: 'Goalkeeper' },
      ],
    });

    const batchResult = await service.syncPlayerPositionsByTeam(66);

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);
    expect(mockPersistPlayerPositionsUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('TC-12: should isolate errors in batch sync (Player A success, Player B fail, Player C success)', async () => {
    mockFootballApiClient.getPlayers.mockResolvedValue({
      count: 3,
      players: [
        { id: 1, name: 'Player A', position: 'Centre-Forward' },
        { id: 2, name: 'Player B', position: 'Centre-Back' },
        { id: 3, name: 'Player C', position: 'Left-Back' },
      ],
    });

    mockPersistPlayerPositionsUseCase.execute
      .mockResolvedValueOnce({
        playerId: 'uuid-1',
        positionCode: 'ST',
        isPrimary: true,
        persistedPosition: mockPersistedPosition,
      })
      .mockRejectedValueOnce(new NotFoundException('Player B not found in DB'))
      .mockResolvedValueOnce({
        playerId: 'uuid-3',
        positionCode: 'LB',
        isPrimary: true,
        persistedPosition: mockPersistedPosition,
      });

    const batchResult = await service.syncPlayerPositionsByTeam(66);

    expect(batchResult.totalRequested).toBe(3);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors).toHaveLength(1);
    expect(batchResult.errors[0].externalPlayerId).toBe('2');
  });

  it('TC-13 & TC-14: should be idempotent and produce exactly one primary position without secondary fabrication', async () => {
    await service.syncPlayerPositionById(mockPlayerExtId);
    await service.syncPlayerPositionById(mockPlayerExtId);

    expect(mockPersistPlayerPositionsUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockPersistPlayerPositionsUseCase.execute).toHaveBeenCalledWith({
      playerExternalId: '44',
      externalProvider: 'FOOTBALL_DATA_ORG',
      positionCode: 'ST',
      isPrimary: true,
    });
  });

  it('TC-15: should not access database directly and delegate purely to PersistPlayerPositionsUseCase', () => {
    expect((service as any).repository).toBeUndefined();
    expect((service as any).dataSource).toBeUndefined();
  });

  it('should throw BadRequestException when externalPlayerId or teamId is empty', async () => {
    await expect(service.syncPlayerPositionById('')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.syncPlayerPositionsByTeam('')).rejects.toThrow(
      BadRequestException,
    );
  });
});
