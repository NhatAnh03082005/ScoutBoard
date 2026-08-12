import { Test, TestingModule } from '@nestjs/testing';
import { MatchesController } from './matches.controller';
import { ListMatchesUseCase } from 'src/modules/matches/application/use-cases/list-matches.use-case';
import { GetMatchByIdUseCase } from 'src/modules/matches/application/use-cases/get-match-by-id.use-case';

describe('MatchesController', () => {
  let controller: MatchesController;
  let mockListUseCase: { execute: jest.Mock };
  let mockGetByIdUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    mockListUseCase = { execute: jest.fn() };
    mockGetByIdUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: ListMatchesUseCase,
          useValue: mockListUseCase,
        },
        {
          provide: GetMatchByIdUseCase,
          useValue: mockGetByIdUseCase,
        },
      ],
    }).compile();

    controller = module.get<MatchesController>(MatchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByCompetitionAndSeason', () => {
    it('should delegate to ListMatchesUseCase', async () => {
      const mockMatches = [{ id: 'match-1' }];
      mockListUseCase.execute.mockResolvedValue(mockMatches);

      const result = await controller.findByCompetitionAndSeason(
        'comp-1',
        'season-1',
      );

      expect(mockListUseCase.execute).toHaveBeenCalledWith(
        'comp-1',
        'season-1',
      );
      expect(result).toEqual(mockMatches);
    });
  });

  describe('findOne', () => {
    it('should delegate to GetMatchByIdUseCase', async () => {
      const mockMatch = { id: 'match-1' };
      mockGetByIdUseCase.execute.mockResolvedValue(mockMatch);

      const result = await controller.findOne('match-1');

      expect(mockGetByIdUseCase.execute).toHaveBeenCalledWith('match-1');
      expect(result).toEqual(mockMatch);
    });
  });
});
