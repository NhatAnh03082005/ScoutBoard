/* eslint-disable @typescript-eslint/unbound-method */
import { ListCompetitionsUseCase } from './list-competitions.use-case';
import { CompetitionReadRepository } from '../ports/competition-read.repository';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

describe('ListCompetitionsUseCase', () => {
  let useCase: ListCompetitionsUseCase;
  let mockCompRepo: jest.Mocked<CompetitionReadRepository>;

  beforeEach(() => {
    mockCompRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new ListCompetitionsUseCase(mockCompRepo);
  });

  it('should return all competitions', async () => {
    const competitions = [{ id: 'comp-1' }] as CompetitionOrmEntity[];
    mockCompRepo.findAll.mockResolvedValue(competitions);

    const result = await useCase.execute();

    expect(result).toEqual(competitions);
    expect(mockCompRepo.findAll).toHaveBeenCalledTimes(1);
  });
});
