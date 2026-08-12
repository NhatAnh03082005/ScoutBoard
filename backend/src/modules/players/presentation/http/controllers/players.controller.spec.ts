import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { SearchPlayersUseCase } from 'src/modules/players/application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from 'src/modules/players/application/use-cases/get-player-by-id.use-case';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';

describe('PlayersController', () => {
  let controller: PlayersController;
  let mockSearchUseCase: {
    execute: jest.Mock;
  };
  let mockGetByIdUseCase: {
    execute: jest.Mock;
  };

  beforeEach(async () => {
    mockSearchUseCase = {
      execute: jest.fn(),
    };
    mockGetByIdUseCase = {
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
});
