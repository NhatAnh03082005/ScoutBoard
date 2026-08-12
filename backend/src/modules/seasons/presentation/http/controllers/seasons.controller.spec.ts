import { Test, TestingModule } from '@nestjs/testing';
import { SeasonsController } from './seasons.controller';
import { ListSeasonsUseCase } from 'src/modules/seasons/application/use-cases/list-seasons.use-case';
import { GetSeasonByIdUseCase } from 'src/modules/seasons/application/use-cases/get-season-by-id.use-case';

describe('SeasonsController', () => {
  let controller: SeasonsController;
  let mockListUseCase: { execute: jest.Mock };
  let mockGetByIdUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    mockListUseCase = { execute: jest.fn() };
    mockGetByIdUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonsController],
      providers: [
        {
          provide: ListSeasonsUseCase,
          useValue: mockListUseCase,
        },
        {
          provide: GetSeasonByIdUseCase,
          useValue: mockGetByIdUseCase,
        },
      ],
    }).compile();

    controller = module.get<SeasonsController>(SeasonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to ListSeasonsUseCase', async () => {
      const mockSeasons = [{ id: 'season-1', seasonCode: '2025-2026' }];
      mockListUseCase.execute.mockResolvedValue(mockSeasons);

      const result = await controller.findAll('comp-1');

      expect(mockListUseCase.execute).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual(mockSeasons);
    });
  });

  describe('findOne', () => {
    it('should delegate to GetSeasonByIdUseCase', async () => {
      const mockSeason = { id: 'season-1', seasonCode: '2025-2026' };
      mockGetByIdUseCase.execute.mockResolvedValue(mockSeason);

      const result = await controller.findOne('season-1');

      expect(mockGetByIdUseCase.execute).toHaveBeenCalledWith('season-1');
      expect(result).toEqual(mockSeason);
    });
  });
});
