import { BadRequestException } from '@nestjs/common';
import { TeamSyncService } from './team-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import {
  PersistTeamWithSquadUseCase,
  PersistTeamWithSquadResult,
} from '../use-cases/persist-team-with-squad.use-case';
import { ExternalTeamDetailDto, ExternalTeamListDto } from '../../../external-football/infrastructure/dto/external-team.dto';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('TeamSyncService', () => {
  let service: TeamSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistUseCase: jest.Mocked<PersistTeamWithSquadUseCase>;

  const mockTeamDetailDto: ExternalTeamDetailDto = {
    id: 66,
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    crest: 'https://crests.football-data.org/66.png',
    founded: 1878,
    venue: 'Old Trafford',
    squad: [
      {
        id: 44,
        name: 'Cristiano Ronaldo',
        position: 'Centre-Forward',
        shirtNumber: 7,
      },
    ],
  };

  const mockPersistedTeam: TeamOrmEntity = {
    id: 'team-uuid-123',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: null,
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: 'https://crests.football-data.org/66.png',
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

  const mockPersistedPlayer: PlayerOrmEntity = {
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
    shirtNumber: 7,
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

  const mockPersistResult: PersistTeamWithSquadResult = {
    teamId: 'team-uuid-123',
    team: mockPersistedTeam,
    playersPersisted: 1,
    players: [mockPersistedPlayer],
  };

  beforeEach(() => {
    mockFootballApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn().mockResolvedValue(mockTeamDetailDto),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
    } as any;

    mockPersistUseCase = {
      execute: jest.fn().mockResolvedValue(mockPersistResult),
    } as any;

    service = new TeamSyncService(
      mockFootballApiClient,
      mockPersistUseCase,
    );
  });

  it('should extract team from client, transform and persist team with squad', async () => {
    const result = await service.syncTeamById(66);

    expect(mockFootballApiClient.getTeamById).toHaveBeenCalledWith(66);
    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '66',
        name: 'Manchester United FC',
        squad: expect.arrayContaining([
          expect.objectContaining({
            externalId: '44',
            name: 'Cristiano Ronaldo',
          }),
        ]),
      }),
    );
    expect(result).toEqual({
      externalId: '66',
      teamId: 'team-uuid-123',
      teamName: 'Manchester United FC',
      playersPersisted: 1,
      persistedTeam: mockPersistedTeam,
      persistedPlayers: [mockPersistedPlayer],
    });
  });

  it('should sync all teams in a competition', async () => {
    const mockListDto: ExternalTeamListDto = {
      count: 2,
      teams: [
        { id: 66, name: 'Manchester United FC' },
        { id: 65, name: 'Manchester City FC' },
      ],
    };

    mockFootballApiClient.getTeams.mockResolvedValue(mockListDto);
    mockFootballApiClient.getTeamById
      .mockResolvedValueOnce(mockTeamDetailDto)
      .mockResolvedValueOnce({
        ...mockTeamDetailDto,
        id: 65,
        name: 'Manchester City FC',
      });

    const batchResult = await service.syncTeamsByCompetition('PL', 2026);

    expect(mockFootballApiClient.getTeams).toHaveBeenCalledWith({
      competitionCode: 'PL',
      season: 2026,
    });
    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(2);
    expect(batchResult.failed).toBe(0);
    expect(batchResult.results).toHaveLength(2);
  });

  it('should propagate client error in single team sync', async () => {
    mockFootballApiClient.getTeamById.mockRejectedValue(new Error('Rate limit exceeded'));

    await expect(service.syncTeamById(66)).rejects.toThrow('Rate limit exceeded');
  });

  it('should isolate failures in batch sync without crashing', async () => {
    const mockListDto: ExternalTeamListDto = {
      count: 2,
      teams: [
        { id: 66, name: 'Manchester United FC' },
        { id: 999, name: 'Unknown Team' },
      ],
    };

    mockFootballApiClient.getTeams.mockResolvedValue(mockListDto);
    mockFootballApiClient.getTeamById
      .mockResolvedValueOnce(mockTeamDetailDto)
      .mockRejectedValueOnce(new Error('404 Not Found'));

    const batchResult = await service.syncTeamsByCompetition('PL');

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.successful).toBe(1);
    expect(batchResult.failed).toBe(1);
    expect(batchResult.errors[0]).toEqual({
      externalId: '999',
      error: '404 Not Found',
    });
  });

  it('should reject empty or invalid inputs', async () => {
    await expect(service.syncTeamById('')).rejects.toThrow(BadRequestException);
    await expect(service.syncTeamsByCompetition('')).rejects.toThrow(BadRequestException);
  });
});
