/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetTeamByIdUseCase } from './get-team-by-id.use-case';
import { TeamReadRepository } from '../ports/team-read.repository';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('GetTeamByIdUseCase', () => {
  let useCase: GetTeamByIdUseCase;
  let mockTeamRepo: jest.Mocked<TeamReadRepository>;

  beforeEach(() => {
    mockTeamRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySeasonId: jest.fn(),
    };
    useCase = new GetTeamByIdUseCase(mockTeamRepo);
  });

  it('should return team when found', async () => {
    const team = { id: 'team-1', name: 'Arsenal' } as TeamOrmEntity;
    mockTeamRepo.findById.mockResolvedValue(team);

    const result = await useCase.execute('team-1');

    expect(result).toEqual(team);
    expect(mockTeamRepo.findById).toHaveBeenCalledWith('team-1');
  });

  it('should throw NotFoundException when team is not found', async () => {
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Đội bóng không tồn tại'),
    );
  });
});
