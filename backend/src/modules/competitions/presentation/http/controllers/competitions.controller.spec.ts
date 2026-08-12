import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionsController } from './competitions.controller';
import { ListCompetitionsUseCase } from 'src/modules/competitions/application/use-cases/list-competitions.use-case';
import { GetCompetitionByIdUseCase } from 'src/modules/competitions/application/use-cases/get-competition-by-id.use-case';
import { GetSeasonsByCompetitionUseCase } from 'src/modules/competitions/application/use-cases/get-seasons-by-competition.use-case';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from 'src/modules/competitions/application/use-cases/get-current-season-teams-by-competition.use-case';

describe('CompetitionsController', () => {
  let controller: CompetitionsController;
  let mockListUseCase: { execute: jest.Mock };
  let mockGetByIdUseCase: { execute: jest.Mock };
  let mockGetSeasonsUseCase: { execute: jest.Mock };
  let mockGetCurrentSeasonTeamsUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    mockListUseCase = { execute: jest.fn() };
    mockGetByIdUseCase = { execute: jest.fn() };
    mockGetSeasonsUseCase = { execute: jest.fn() };
    mockGetCurrentSeasonTeamsUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionsController],
      providers: [
        {
          provide: ListCompetitionsUseCase,
          useValue: mockListUseCase,
        },
        {
          provide: GetCompetitionByIdUseCase,
          useValue: mockGetByIdUseCase,
        },
        {
          provide: GetSeasonsByCompetitionUseCase,
          useValue: mockGetSeasonsUseCase,
        },
        {
          provide: GetCurrentSeasonTeamsByCompetitionUseCase,
          useValue: mockGetCurrentSeasonTeamsUseCase,
        },
      ],
    }).compile();

    controller = module.get<CompetitionsController>(CompetitionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to ListCompetitionsUseCase', async () => {
      const mockComps = [{ id: 'comp-1', name: 'Premier League' }];
      mockListUseCase.execute.mockResolvedValue(mockComps);

      const result = await controller.findAll();

      expect(mockListUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockComps);
    });
  });

  describe('findOne', () => {
    it('should delegate to GetCompetitionByIdUseCase', async () => {
      const mockComp = { id: 'comp-1', name: 'Premier League' };
      mockGetByIdUseCase.execute.mockResolvedValue(mockComp);

      const result = await controller.findOne('comp-1');

      expect(mockGetByIdUseCase.execute).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual(mockComp);
    });
  });

  describe('findSeasonsByCompetitionId', () => {
    it('should delegate to GetSeasonsByCompetitionUseCase', async () => {
      const mockSeasons = [{ id: 'season-1', seasonCode: '2025-2026' }];
      mockGetSeasonsUseCase.execute.mockResolvedValue(mockSeasons);

      const result = await controller.findSeasonsByCompetitionId('comp-1');

      expect(mockGetSeasonsUseCase.execute).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual(mockSeasons);
    });
  });

  describe('findCurrentSeasonTeams', () => {
    it('should delegate to GetCurrentSeasonTeamsByCompetitionUseCase', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Arsenal FC' }];
      mockGetCurrentSeasonTeamsUseCase.execute.mockResolvedValue(mockTeams);

      const result = await controller.findCurrentSeasonTeams('comp-1');

      expect(mockGetCurrentSeasonTeamsUseCase.execute).toHaveBeenCalledWith(
        'comp-1',
      );
      expect(result).toEqual(mockTeams);
    });
  });
});
