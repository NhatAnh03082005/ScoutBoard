import { BadRequestException } from '@nestjs/common';
import { PlayerSyncService } from './player-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import { PersistPlayerUseCase } from '../use-cases/persist-player.use-case';
import { TeamWriteRepository } from '../../../teams/application/ports/team-write.repository';
import { ExternalPlayerDetailDto, ExternalPlayerListDto } from '../../../external-football/infrastructure/dto/external-player.dto';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('PlayerSyncService', () => {
  let service: PlayerSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistUseCase: jest.Mocked<PersistPlayerUseCase>;
  let mockTeamRepository: jest.Mocked<TeamWriteRepository>;

  const mockPlayerDetailDto: ExternalPlayerDetailDto = {
    id: 44,
    name: 'Cristiano Ronaldo',
    position: 'Centre-Forward',
    currentTeam: {
      id: 66,
      name: 'Manchester United FC',
    },
  };

  const mockTeamEntity: TeamOrmEntity = {
    id: 'team-uuid-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [],
    teamHistory: [],
    homeMatches: [],
    awayMatches: [],
    matchStatistics: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  const mockPlayerEntity: PlayerOrmEntity = {
    id: 'player-uuid-1',
    currentTeamId: 'team-uuid-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '44',
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shortName: null,
    dateOfBirth: null,
    nationality: null,
    heightCm: null,
    weightKg: null,
    preferredFoot: null,
    primaryPosition: 'Centre-Forward',
    shirtNumber: null,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: null,
    positions: [],
    teamHistory: [],
    matchStatistics: [],
    seasonStatistics: [],
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
      getPlayerById: jest.fn().mockResolvedValue(mockPlayerDetailDto),
    } as any;

    mockPersistUseCase = {
      execute: jest.fn().mockResolvedValue(mockPlayerEntity),
      executeMany: jest.fn(),
    } as any;

    mockTeamRepository = {
      findByExternalIdentity: jest.fn().mockResolvedValue(mockTeamEntity),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    service = new PlayerSyncService(
      mockFootballApiClient,
      mockPersistUseCase,
      mockTeamRepository,
    );
  });

  it('should extract player from client, resolve team UUID, and persist player', async () => {
    const result = await service.syncPlayerById(44);

    expect(mockFootballApiClient.getPlayerById).toHaveBeenCalledWith(44);
    expect(mockTeamRepository.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '66',
    );
    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '44',
        name: 'Cristiano Ronaldo',
        primaryPosition: 'Centre-Forward',
      }),
      'team-uuid-123',
    );

    expect(result).toEqual({
      externalId: '44',
      playerId: 'player-uuid-1',
      playerName: 'Cristiano Ronaldo',
      currentTeamId: 'team-uuid-123',
      persistedPlayer: mockPlayerEntity,
    });
  });

  it('should sync players by team ID and resolve team internal UUID', async () => {
    const mockListDto: ExternalPlayerListDto = {
      count: 2,
      players: [
        mockPlayerDetailDto,
        {
          id: 45,
          name: 'Bruno Fernandes',
          position: 'Attacking Midfield',
        },
      ],
    };

    mockFootballApiClient.getPlayers.mockResolvedValue(mockListDto);

    const batchResult = await service.syncPlayersByTeam(66);

    expect(mockFootballApiClient.getPlayers).toHaveBeenCalledWith({ teamId: 66 });
    expect(mockTeamRepository.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '66',
    );
    expect(mockPersistUseCase.execute).toHaveBeenCalledTimes(2);
    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);
  });

  it('should batch sync players and isolate failures', async () => {
    const mockListDto: ExternalPlayerListDto = {
      count: 2,
      players: [
        mockPlayerDetailDto,
        { id: 9999, name: 'Unknown Player' },
      ],
    };

    mockFootballApiClient.getPlayers.mockResolvedValue(mockListDto);
    mockFootballApiClient.getPlayerById
      .mockResolvedValueOnce(mockPlayerDetailDto)
      .mockRejectedValueOnce(new Error('Person not found 404'));

    const batchResult = await service.syncPlayers();

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(1);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors[0]).toEqual({
      externalId: '9999',
      error: 'Person not found 404',
    });
  });

  it('should propagate client errors in syncPlayerById', async () => {
    mockFootballApiClient.getPlayerById.mockRejectedValue(new Error('Player not found'));

    await expect(service.syncPlayerById(44)).rejects.toThrow('Player not found');
  });

  it('should reject empty player ID or team ID', async () => {
    await expect(service.syncPlayerById('')).rejects.toThrow(BadRequestException);
    await expect(service.syncPlayersByTeam('')).rejects.toThrow(BadRequestException);
  });
});
