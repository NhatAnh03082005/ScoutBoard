/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetSeasonByIdUseCase } from './get-season-by-id.use-case';
import { SeasonReadRepository } from '../ports/season-read.repository';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('GetSeasonByIdUseCase', () => {
  let useCase: GetSeasonByIdUseCase;
  let mockSeasonRepo: jest.Mocked<SeasonReadRepository>;

  beforeEach(() => {
    mockSeasonRepo = {
      findAll: jest.fn(),
      findByCompetition: jest.fn(),
      findById: jest.fn(),
      findCurrentByCompetitionId: jest.fn(),
    };
    useCase = new GetSeasonByIdUseCase(mockSeasonRepo);
  });

  it('should return season when found', async () => {
    const season = { id: 'season-1' } as SeasonOrmEntity;
    mockSeasonRepo.findById.mockResolvedValue(season);

    const result = await useCase.execute('season-1');

    expect(result).toEqual(season);
    expect(mockSeasonRepo.findById).toHaveBeenCalledWith('season-1');
  });

  it('should throw NotFoundException when season is not found', async () => {
    mockSeasonRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Mùa giải không tồn tại'),
    );
  });
});
