import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { ListTeamsUseCase } from 'src/modules/teams/application/use-cases/list-teams.use-case';
import { GetTeamByIdUseCase } from 'src/modules/teams/application/use-cases/get-team-by-id.use-case';

describe('TeamsController', () => {
  let controller: TeamsController;
  let mockListUseCase: { execute: jest.Mock };
  let mockGetByIdUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    mockListUseCase = { execute: jest.fn() };
    mockGetByIdUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: ListTeamsUseCase,
          useValue: mockListUseCase,
        },
        {
          provide: GetTeamByIdUseCase,
          useValue: mockGetByIdUseCase,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to ListTeamsUseCase', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Arsenal' }];
      mockListUseCase.execute.mockResolvedValue(mockTeams);

      const result = await controller.findAll();

      expect(mockListUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockTeams);
    });
  });

  describe('findOne', () => {
    it('should delegate to GetTeamByIdUseCase', async () => {
      const mockTeam = { id: 'team-1', name: 'Arsenal' };
      mockGetByIdUseCase.execute.mockResolvedValue(mockTeam);

      const result = await controller.findOne('team-1');

      expect(mockGetByIdUseCase.execute).toHaveBeenCalledWith('team-1');
      expect(result).toEqual(mockTeam);
    });
  });
});
