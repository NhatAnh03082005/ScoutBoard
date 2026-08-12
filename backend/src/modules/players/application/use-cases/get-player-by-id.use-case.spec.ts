/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { GetPlayerByIdUseCase } from './get-player-by-id.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('GetPlayerByIdUseCase', () => {
  let useCase: GetPlayerByIdUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  const mockPlayer = {
    id: 'player-123',
    name: 'Test Player',
  } as PlayerOrmEntity;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
    };
    useCase = new GetPlayerByIdUseCase(mockPlayerRepo);
  });

  it('should return player entity when player is found', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockPlayer);

    const result = await useCase.execute('player-123');

    expect(result).toEqual(mockPlayer);
    expect(mockPlayerRepo.findById).toHaveBeenCalledWith('player-123');
  });

  it('should throw NotFoundException when player is not found', async () => {
    mockPlayerRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      new NotFoundException('Cầu thủ không tồn tại'),
    );
  });
});
