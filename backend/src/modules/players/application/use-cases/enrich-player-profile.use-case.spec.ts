import { EnrichPlayerProfileUseCase } from './enrich-player-profile.use-case';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { NotFoundException } from '@nestjs/common';

describe('EnrichPlayerProfileUseCase', () => {
  let useCase: EnrichPlayerProfileUseCase;
  let mockPlayerRepo: any;

  beforeEach(() => {
    mockPlayerRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const mockPlayerWriteRepo = {
      playerRepository: mockPlayerRepo,
    };

    useCase = new EnrichPlayerProfileUseCase(mockPlayerWriteRepo as any);
  });

  it('should throw NotFoundException if player ID is missing or invalid', async () => {
    await expect(
      useCase.execute({ playerId: '', enrichment: {} as any }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enrich player photo, height, weight, and primaryPosition', async () => {
    const existingPlayer: Partial<PlayerOrmEntity> = {
      id: 'player-uuid-1',
      name: 'Aaron Wan-Bissaka',
      primaryPosition: 'CB',
      imageUrl: null,
      heightCm: null,
      weightKg: null,
      shirtNumber: null,
    };

    mockPlayerRepo.findOne.mockResolvedValue(existingPlayer);

    const enrichment = {
      externalId: '18883',
      name: 'Aaron Wan-Bissaka',
      normalizedName: 'aaron wan bissaka',
      heightCm: 183,
      weightKg: 72,
      primaryPosition: 'RB',
      shirtNumber: 29,
      imageUrl: 'https://media.api-sports.io/football/players/18883.png',
    };

    const result = await useCase.execute({
      playerId: 'player-uuid-1',
      enrichment,
    });

    expect(result.imageUrl).toBe(
      'https://media.api-sports.io/football/players/18883.png',
    );
    expect(result.heightCm).toBe(183);
    expect(result.weightKg).toBe(72);
    expect(result.primaryPosition).toBe('RB');
    expect(result.shirtNumber).toBe(29);
    expect(mockPlayerRepo.save).toHaveBeenCalled();
  });

  it('should not overwrite existing attributes if enrichment field is null', async () => {
    const existingPlayer: Partial<PlayerOrmEntity> = {
      id: 'player-uuid-1',
      name: 'Aaron Wan-Bissaka',
      imageUrl: 'https://existing.png',
      heightCm: 183,
      weightKg: 72,
    };

    mockPlayerRepo.findOne.mockResolvedValue(existingPlayer);

    const result = await useCase.execute({
      playerId: 'player-uuid-1',
      enrichment: {
        externalId: '18883',
        name: 'Aaron Wan-Bissaka',
        normalizedName: 'aaron wan bissaka',
        heightCm: null,
        weightKg: null,
        primaryPosition: null,
        shirtNumber: null,
        imageUrl: null,
      },
    });

    expect(result.imageUrl).toBe('https://existing.png');
    expect(result.heightCm).toBe(183);
    expect(result.weightKg).toBe(72);
  });
});
