import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PLAYER_READ_REPOSITORY } from '../../../application/ports/player-read.repository';
import { PlayerOrmEntity } from '../../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';

describe('PlayersController', () => {
  let controller: PlayersController;
  let mockPlayerRepo: {
    search: jest.Mock;
    findById: jest.Mock;
  };

  const mockTeam: TeamOrmEntity = {
    id: 'team-ars-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: '57',
    name: 'Arsenal FC',
    shortName: 'Arsenal',
    tla: 'ARS',
    country: 'England',
    foundedYear: 1886,
    venueName: 'Emirates Stadium',
    logoUrl: 'https://crests.football-data.org/57.png',
    status: 'ACTIVE',
    dataUpdatedAt: new Date(),
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

  const mockPlayerWithTeam: PlayerOrmEntity = {
    id: 'player-saka-uuid',
    currentTeamId: 'team-ars-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: '1234',
    name: 'Bukayo Saka',
    normalizedName: 'bukayo saka',
    shortName: 'B. Saka',
    dateOfBirth: '2001-09-05',
    nationality: 'England',
    heightCm: 178,
    weightKg: 72,
    preferredFoot: 'LEFT',
    primaryPosition: 'RW',
    shirtNumber: 7,
    imageUrl: 'saka.png',
    status: 'ACTIVE',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: mockTeam,
    positions: [],
    teamHistory: [],
    matchStatistics: [],
    seasonStatistics: [],
  };

  const mockPlayerWithoutTeam: PlayerOrmEntity = {
    id: 'player-free-uuid',
    currentTeamId: null,
    externalProvider: 'API_FOOTBALL',
    externalId: '5678',
    name: 'Free Agent Player',
    normalizedName: 'free agent player',
    shortName: 'Free Agent',
    dateOfBirth: '2000-01-01',
    nationality: 'Spain',
    heightCm: 180,
    weightKg: 75,
    preferredFoot: 'RIGHT',
    primaryPosition: 'CM',
    shirtNumber: 10,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: null,
    positions: [],
    teamHistory: [],
    matchStatistics: [],
    seasonStatistics: [],
  };

  beforeEach(async () => {
    mockPlayerRepo = {
      search: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        {
          provide: PLAYER_READ_REPOSITORY,
          useValue: mockPlayerRepo,
        },
      ],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return player list with default pagination metadata', async () => {
      mockPlayerRepo.search.mockResolvedValue({
        items: [mockPlayerWithTeam, mockPlayerWithoutTeam],
        total: 2,
      });

      const query: SearchPlayersQueryDto = { limit: 20, offset: 0 };
      const result = await controller.search(query);

      expect(result.pagination).toEqual({
        limit: 20,
        offset: 0,
        total: 2,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'player-saka-uuid',
        fullName: 'Bukayo Saka',
        imageUrl: 'saka.png',
        dateOfBirth: '2001-09-05',
        nationality: 'England',
        preferredFoot: 'LEFT',
        heightCm: 178,
        primaryPosition: 'RW',
        currentTeam: {
          id: 'team-ars-uuid',
          name: 'Arsenal FC',
          shortName: 'Arsenal',
          logoUrl: 'https://crests.football-data.org/57.png',
          country: 'England',
        },
      });
    });

    it('should map currentTeam to null when player has no currentTeamId', async () => {
      mockPlayerRepo.search.mockResolvedValue({
        items: [mockPlayerWithoutTeam],
        total: 1,
      });

      const query: SearchPlayersQueryDto = { limit: 20, offset: 0 };
      const result = await controller.search(query);

      expect(result.items[0].currentTeam).toBeNull();
    });

    it('should not include raw ORM properties, relations or timestamps in DTO', async () => {
      mockPlayerRepo.search.mockResolvedValue({
        items: [mockPlayerWithTeam],
        total: 1,
      });

      const query: SearchPlayersQueryDto = { limit: 20, offset: 0 };
      const result = await controller.search(query);

      const item = result.items[0];
      expect(item).not.toHaveProperty('seasonStatistics');
      expect(item).not.toHaveProperty('matchStatistics');
      expect(item).not.toHaveProperty('teamHistory');
      expect(item).not.toHaveProperty('positions');
      expect(item).not.toHaveProperty('normalizedName');
      expect(item).not.toHaveProperty('externalProvider');
      expect(item).not.toHaveProperty('externalId');
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('updatedAt');
    });
  });

  describe('findOne', () => {
    it('should return player details when player exists', async () => {
      mockPlayerRepo.findById.mockResolvedValue(mockPlayerWithTeam);

      const result = await controller.findOne('player-saka-uuid');

      expect(result).toEqual(mockPlayerWithTeam);
      expect(mockPlayerRepo.findById).toHaveBeenCalledWith('player-saka-uuid');
    });

    it('should throw NotFoundException when player is not found', async () => {
      mockPlayerRepo.findById.mockResolvedValue(null);

      await expect(controller.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
