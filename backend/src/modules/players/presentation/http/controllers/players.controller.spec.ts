import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { SearchPlayersUseCase } from 'src/modules/players/application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from 'src/modules/players/application/use-cases/get-player-by-id.use-case';
import { GetPlayerTeamHistoryUseCase } from 'src/modules/players/application/use-cases/get-player-team-history.use-case';
import { GetPlayerSeasonStatisticsUseCase } from 'src/modules/players/application/use-cases/get-player-season-statistics.use-case';
import { GetPlayerMatchStatisticsUseCase } from 'src/modules/players/application/use-cases/get-player-match-statistics.use-case';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';

describe('PlayersController', () => {
  let controller: PlayersController;
  let mockSearchUseCase: {
    execute: jest.Mock;
  };
  let mockGetByIdUseCase: {
    execute: jest.Mock;
  };
  let mockGetTeamHistoryUseCase: {
    execute: jest.Mock;
  };
  let mockGetSeasonStatisticsUseCase: {
    execute: jest.Mock;
  };
  let mockGetMatchStatisticsUseCase: {
    execute: jest.Mock;
  };

  beforeEach(async () => {
    mockSearchUseCase = {
      execute: jest.fn(),
    };
    mockGetByIdUseCase = {
      execute: jest.fn(),
    };
    mockGetTeamHistoryUseCase = {
      execute: jest.fn(),
    };
    mockGetSeasonStatisticsUseCase = {
      execute: jest.fn(),
    };
    mockGetMatchStatisticsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        {
          provide: SearchPlayersUseCase,
          useValue: mockSearchUseCase,
        },
        {
          provide: GetPlayerByIdUseCase,
          useValue: mockGetByIdUseCase,
        },
        {
          provide: GetPlayerTeamHistoryUseCase,
          useValue: mockGetTeamHistoryUseCase,
        },
        {
          provide: GetPlayerSeasonStatisticsUseCase,
          useValue: mockGetSeasonStatisticsUseCase,
        },
        {
          provide: GetPlayerMatchStatisticsUseCase,
          useValue: mockGetMatchStatisticsUseCase,
        },
      ],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should delegate search execution to SearchPlayersUseCase', async () => {
      const query: SearchPlayersQueryDto = { limit: 20, offset: 0 };
      const expectedResponse = {
        items: [],
        pagination: { limit: 20, offset: 0, total: 0 },
      };
      mockSearchUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.search(query);

      expect(mockSearchUseCase.execute).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to GetPlayerByIdUseCase', async () => {
      const expectedPlayer = { id: 'player-123', name: 'Bukayo Saka' };
      mockGetByIdUseCase.execute.mockResolvedValue(expectedPlayer);

      const result = await controller.findOne('player-123');

      expect(mockGetByIdUseCase.execute).toHaveBeenCalledWith('player-123');
      expect(result).toEqual(expectedPlayer);
    });
  });

  describe('getTeamHistory', () => {
    it('should delegate getTeamHistory to GetPlayerTeamHistoryUseCase', async () => {
      const expectedHistory = [
        {
          id: 'hist-1',
          team: { id: 'team-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null, country: 'England' },
          joinedAt: '2024-07-01',
          leftAt: null,
          shirtNumber: 7,
          isCurrent: true,
        },
      ];
      mockGetTeamHistoryUseCase.execute.mockResolvedValue(expectedHistory);

      const result = await controller.getTeamHistory('player-123');

      expect(mockGetTeamHistoryUseCase.execute).toHaveBeenCalledWith('player-123');
      expect(result).toEqual(expectedHistory);
    });
  });

  describe('getSeasonStatistics', () => {
    it('should delegate getSeasonStatistics to GetPlayerSeasonStatisticsUseCase', async () => {
      const expectedStats = [
        {
          id: 'stat-1',
          season: { id: 's-1', seasonCode: '2025-2026', isCurrent: true },
          competition: { id: 'c-1', name: 'Premier League', country: 'England' },
          team: { id: 't-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
          appearances: 31,
          starts: 28,
          minutesPlayed: 2480,
          goals: 9,
          assists: 12,
          shots: 65,
          shotsOnTarget: 31,
          passes: 1240,
          passAccuracy: 86.4,
          keyPasses: 54,
          tackles: 28,
          interceptions: 17,
          duelsWon: 121,
        },
      ];
      mockGetSeasonStatisticsUseCase.execute.mockResolvedValue(expectedStats);

      const result = await controller.getSeasonStatistics('player-123');

      expect(mockGetSeasonStatisticsUseCase.execute).toHaveBeenCalledWith('player-123');
      expect(result).toEqual(expectedStats);
    });
  });

  describe('getMatchStatistics', () => {
    it('should delegate getMatchStatistics to GetPlayerMatchStatisticsUseCase', async () => {
      const query = { limit: 10, offset: 0 };
      const expectedResponse = {
        items: [],
        pagination: { limit: 10, offset: 0, total: 0 },
      };
      mockGetMatchStatisticsUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getMatchStatistics('player-123', query);

      expect(mockGetMatchStatisticsUseCase.execute).toHaveBeenCalledWith('player-123', query);
      expect(result).toEqual(expectedResponse);
    });
  });
});
