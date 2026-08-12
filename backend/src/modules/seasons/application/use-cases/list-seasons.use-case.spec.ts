/* eslint-disable @typescript-eslint/unbound-method */
import { ListSeasonsUseCase } from './list-seasons.use-case';
import { SeasonReadRepository } from '../ports/season-read.repository';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('ListSeasonsUseCase', () => {
  let useCase: ListSeasonsUseCase;
  let mockSeasonRepo: jest.Mocked<SeasonReadRepository>;

  beforeEach(() => {
    mockSeasonRepo = {
      findAll: jest.fn(),
      findByCompetition: jest.fn(),
      findById: jest.fn(),
      findCurrentByCompetitionId: jest.fn(),
    };
    useCase = new ListSeasonsUseCase(mockSeasonRepo);
  });

  it('should return all seasons', async () => {
    const seasons = [{ id: 'season-1' }] as SeasonOrmEntity[];
    mockSeasonRepo.findAll.mockResolvedValue(seasons);

    const result = await useCase.execute('comp-1');

    expect(result).toEqual(seasons);
    expect(mockSeasonRepo.findAll).toHaveBeenCalledWith('comp-1');
  });
});
