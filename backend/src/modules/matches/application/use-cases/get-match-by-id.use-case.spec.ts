/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetMatchByIdUseCase } from './get-match-by-id.use-case';
import { MatchReadRepository } from '../ports/match-read.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

describe('GetMatchByIdUseCase', () => {
  let useCase: GetMatchByIdUseCase;
  let mockMatchRepo: jest.Mocked<MatchReadRepository>;

  beforeEach(() => {
    mockMatchRepo = {
      findById: jest.fn(),
      findByCompetitionAndSeason: jest.fn(),
    };
    useCase = new GetMatchByIdUseCase(mockMatchRepo);
  });

  it('should return match when found', async () => {
    const match = { id: 'match-1' } as MatchOrmEntity;
    mockMatchRepo.findById.mockResolvedValue(match);

    const result = await useCase.execute('match-1');

    expect(result).toEqual(match);
    expect(mockMatchRepo.findById).toHaveBeenCalledWith('match-1');
  });

  it('should throw NotFoundException when match is not found', async () => {
    mockMatchRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Trận đấu không tồn tại'),
    );
  });
});
