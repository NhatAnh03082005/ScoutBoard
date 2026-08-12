/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetCompetitionByIdUseCase } from './get-competition-by-id.use-case';
import { CompetitionReadRepository } from '../ports/competition-read.repository';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

describe('GetCompetitionByIdUseCase', () => {
  let useCase: GetCompetitionByIdUseCase;
  let mockCompRepo: jest.Mocked<CompetitionReadRepository>;

  beforeEach(() => {
    mockCompRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new GetCompetitionByIdUseCase(mockCompRepo);
  });

  it('should return competition when found', async () => {
    const comp = { id: 'comp-1', name: 'PL' } as CompetitionOrmEntity;
    mockCompRepo.findById.mockResolvedValue(comp);

    const result = await useCase.execute('comp-1');

    expect(result).toEqual(comp);
    expect(mockCompRepo.findById).toHaveBeenCalledWith('comp-1');
  });

  it('should throw NotFoundException when competition is not found', async () => {
    mockCompRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Giải đấu không tồn tại'),
    );
  });
});
