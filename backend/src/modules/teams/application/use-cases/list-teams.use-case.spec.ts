/* eslint-disable @typescript-eslint/unbound-method */
import { ListTeamsUseCase } from './list-teams.use-case';
import { TeamReadRepository } from '../ports/team-read.repository';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('ListTeamsUseCase', () => {
  let useCase: ListTeamsUseCase;
  let mockTeamRepo: jest.Mocked<TeamReadRepository>;

  beforeEach(() => {
    mockTeamRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySeasonId: jest.fn(),
    };
    useCase = new ListTeamsUseCase(mockTeamRepo);
  });

  it('should return all teams', async () => {
    const teams = [{ id: 'team-1' }] as TeamOrmEntity[];
    mockTeamRepo.findAll.mockResolvedValue(teams);

    const result = await useCase.execute();

    expect(result).toEqual(teams);
    expect(mockTeamRepo.findAll).toHaveBeenCalledTimes(1);
  });
});
