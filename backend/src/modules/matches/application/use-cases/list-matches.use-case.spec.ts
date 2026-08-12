/* eslint-disable @typescript-eslint/unbound-method */
import { ListMatchesUseCase } from './list-matches.use-case';
import { MatchReadRepository } from '../ports/match-read.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

describe('ListMatchesUseCase', () => {
  let useCase: ListMatchesUseCase;
  let mockMatchRepo: jest.Mocked<MatchReadRepository>;

  beforeEach(() => {
    mockMatchRepo = {
      findById: jest.fn(),
      findByCompetitionAndSeason: jest.fn(),
    };
    useCase = new ListMatchesUseCase(mockMatchRepo);
  });

  it('should return empty array when competitionId or seasonId is missing', async () => {
    const result = await useCase.execute('', 'season-1');
    expect(result).toEqual([]);
    expect(mockMatchRepo.findByCompetitionAndSeason).not.toHaveBeenCalled();
  });

  it('should return matches when competitionId and seasonId are provided', async () => {
    const matches = [{ id: 'match-1' }] as MatchOrmEntity[];
    mockMatchRepo.findByCompetitionAndSeason.mockResolvedValue(matches);

    const result = await useCase.execute('comp-1', 'season-1');

    expect(result).toEqual(matches);
    expect(mockMatchRepo.findByCompetitionAndSeason).toHaveBeenCalledWith(
      'comp-1',
      'season-1',
    );
  });
});
