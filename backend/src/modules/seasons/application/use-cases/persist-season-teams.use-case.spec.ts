import { BadRequestException } from '@nestjs/common';
import { PersistSeasonTeamsUseCase } from './persist-season-teams.use-case';
import { SeasonTeamWriteRepository } from '../ports/season-team-write.repository';
import { SeasonTeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season-team.orm-entity';

describe('PersistSeasonTeamsUseCase', () => {
  let useCase: PersistSeasonTeamsUseCase;
  let mockRepository: jest.Mocked<SeasonTeamWriteRepository>;

  const mockSeasonId = 'season-uuid-1';
  const mockTeamIds = ['team-uuid-1', 'team-uuid-2'];
  const mockEntities: SeasonTeamOrmEntity[] = [
    {
      seasonId: mockSeasonId,
      teamId: 'team-uuid-1',
      createdAt: new Date(),
      season: null as any,
      team: null as any,
    },
    {
      seasonId: mockSeasonId,
      teamId: 'team-uuid-2',
      createdAt: new Date(),
      season: null as any,
      team: null as any,
    },
  ];

  beforeEach(() => {
    mockRepository = {
      addTeamToSeason: jest.fn(),
      addTeamsToSeason: jest.fn().mockResolvedValue(mockEntities),
      removeTeamFromSeason: jest.fn(),
      findBySeasonAndTeam: jest.fn(),
      findBySeasonId: jest.fn(),
    };

    useCase = new PersistSeasonTeamsUseCase(mockRepository);
  });

  it('should persist valid season teams', async () => {
    const result = await useCase.execute({
      seasonId: mockSeasonId,
      teamIds: mockTeamIds,
    });

    expect(mockRepository.addTeamsToSeason).toHaveBeenCalledWith(
      mockSeasonId,
      mockTeamIds,
    );
    expect(result).toEqual({
      seasonId: mockSeasonId,
      totalLinked: 2,
      seasonTeams: mockEntities,
    });
  });

  it('should handle empty teamIds gracefully', async () => {
    const result = await useCase.execute({
      seasonId: mockSeasonId,
      teamIds: [],
    });

    expect(result).toEqual({
      seasonId: mockSeasonId,
      totalLinked: 0,
      seasonTeams: [],
    });
    expect(mockRepository.addTeamsToSeason).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when seasonId is missing', async () => {
    await expect(
      useCase.execute({
        seasonId: '',
        teamIds: mockTeamIds,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(useCase.execute(null as any)).rejects.toThrow(BadRequestException);
  });
});
