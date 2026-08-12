/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetSeasonsByCompetitionUseCase } from './get-seasons-by-competition.use-case';
import { CompetitionReadRepository } from '../ports/competition-read.repository';
import { SeasonReadRepository } from 'src/modules/seasons/application/ports/season-read.repository';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('GetSeasonsByCompetitionUseCase', () => {
  let useCase: GetSeasonsByCompetitionUseCase;
  let mockCompRepo: jest.Mocked<CompetitionReadRepository>;
  let mockSeasonRepo: jest.Mocked<SeasonReadRepository>;

  beforeEach(() => {
    mockCompRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    mockSeasonRepo = {
      findAll: jest.fn(),
      findByCompetition: jest.fn(),
      findById: jest.fn(),
      findCurrentByCompetitionId: jest.fn(),
    };
    useCase = new GetSeasonsByCompetitionUseCase(mockCompRepo, mockSeasonRepo);
  });

  it('should return seasons when competition exists', async () => {
    const comp = { id: 'comp-1' } as CompetitionOrmEntity;
    const seasons = [{ id: 'season-1' }] as SeasonOrmEntity[];
    mockCompRepo.findById.mockResolvedValue(comp);
    mockSeasonRepo.findByCompetition.mockResolvedValue(seasons);

    const result = await useCase.execute('comp-1');

    expect(result).toEqual(seasons);
    expect(mockCompRepo.findById).toHaveBeenCalledWith('comp-1');
    expect(mockSeasonRepo.findByCompetition).toHaveBeenCalledWith('comp-1');
  });

  it('should throw NotFoundException when competition is not found', async () => {
    mockCompRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Giải đấu không tồn tại'),
    );
  });
});
