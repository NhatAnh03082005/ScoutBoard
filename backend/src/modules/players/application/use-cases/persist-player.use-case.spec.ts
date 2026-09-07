import { BadRequestException } from '@nestjs/common';
import { PersistPlayerUseCase } from './persist-player.use-case';
import { PlayerWriteRepository } from '../ports/player-write.repository';
import { TransformedPlayer } from '../../../external-football/domain/models/transformed-player.model';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('PersistPlayerUseCase', () => {
  let useCase: PersistPlayerUseCase;
  let mockRepository: jest.Mocked<PlayerWriteRepository>;

  const mockTeamId = 'team-uuid-123';
  const mockTransformedPlayer: TransformedPlayer = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '44',
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shortName: 'Ronaldo',
    dateOfBirth: '1985-02-05',
    nationality: 'Portugal',
    heightCm: 187,
    weightKg: 83,
    primaryPosition: 'Centre-Forward',
    shirtNumber: 7,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
  };

  const mockPlayerEntity: PlayerOrmEntity = {
    id: 'player-uuid-1',
    currentTeamId: mockTeamId,
    ...mockTransformedPlayer,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: null,
    positions: [],
    teamHistory: [],
    matchStatistics: [],
    seasonStatistics: [],
  };

  beforeEach(() => {
    mockRepository = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockPlayerEntity),
      upsertMany: jest.fn().mockResolvedValue([mockPlayerEntity]),
    };

    useCase = new PersistPlayerUseCase(mockRepository);
  });

  it('should persist a valid transformed player with teamId', async () => {
    const result = await useCase.execute(mockTransformedPlayer, mockTeamId);

    expect(mockRepository.upsert).toHaveBeenCalledWith(mockTransformedPlayer, mockTeamId);
    expect(result).toBe(mockPlayerEntity);
  });

  it('should persist an array of transformed players', async () => {
    const result = await useCase.executeMany([mockTransformedPlayer], mockTeamId);

    expect(mockRepository.upsertMany).toHaveBeenCalledWith([mockTransformedPlayer], mockTeamId);
    expect(result).toEqual([mockPlayerEntity]);
  });

  it('should return empty array when executeMany receives empty list', async () => {
    const result = await useCase.executeMany([]);

    expect(result).toEqual([]);
    expect(mockRepository.upsertMany).not.toHaveBeenCalled();
  });

  it('should reject invalid input missing required fields', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedPlayer, externalProvider: '' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedPlayer, externalId: '  ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute({ ...mockTransformedPlayer, name: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
