import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersistPlayerPositionsUseCase } from './persist-player-positions.use-case';
import { PlayerPositionWriteRepository } from '../ports/player-position-write.repository';
import { PlayerWriteRepository } from '../ports/player-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-position.orm-entity';

describe('PersistPlayerPositionsUseCase', () => {
  let useCase: PersistPlayerPositionsUseCase;
  let mockPosRepo: jest.Mocked<PlayerPositionWriteRepository>;
  let mockPlayerRepo: jest.Mocked<PlayerWriteRepository>;

  const mockPlayerId = 'player-uuid-1';
  const mockPlayerEntity: PlayerOrmEntity = {
    id: mockPlayerId,
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '44',
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shortName: 'Ronaldo',
    dateOfBirth: '1985-02-05',
    nationality: 'Portugal',
    heightCm: 187,
    weightKg: 83,
    preferredFoot: 'RIGHT',
    primaryPosition: 'ST',
    shirtNumber: 7,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
    currentTeamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: null,
    positions: [],
    teamHistory: [],
    seasonStatistics: [],
    matchStatistics: [],
    shortlistPlayers: [],
    squadPlayers: [],
  };

  const mockPositionEntity: PlayerPositionOrmEntity = {
    id: 'pos-uuid-1',
    playerId: mockPlayerId,
    positionCode: 'ST',
    isPrimary: true,
    player: null as any,
  };

  beforeEach(() => {
    mockPosRepo = {
      findByPlayerAndPosition: jest.fn(),
      findByPlayerId: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockPositionEntity),
      upsertMany: jest.fn().mockResolvedValue([mockPositionEntity]),
      updatePrimaryPosition: jest.fn(),
    };

    mockPlayerRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue(mockPlayerEntity),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    useCase = new PersistPlayerPositionsUseCase(mockPosRepo, mockPlayerRepo);
  });

  it('TC-08: should resolve internal Player UUID from externalProvider and externalId', async () => {
    const result = await useCase.execute({
      playerExternalId: '44',
      externalProvider: 'FOOTBALL_DATA_ORG',
      positionCode: 'ST',
      isPrimary: true,
    });

    expect(mockPlayerRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '44',
    );
    expect(mockPosRepo.upsert).toHaveBeenCalledWith(mockPlayerId, 'ST', true);
    expect(result.playerId).toBe(mockPlayerId);
    expect(result.positionCode).toBe('ST');
    expect(result.isPrimary).toBe(true);
  });

  it('TC-09: should resolve correct player for different externalProvider', async () => {
    await useCase.execute({
      playerExternalId: '44',
      externalProvider: 'CUSTOM_PROVIDER',
      positionCode: 'LW',
      isPrimary: false,
    });

    expect(mockPlayerRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'CUSTOM_PROVIDER',
      '44',
    );
  });

  it('should accept direct playerId without calling playerWriteRepository', async () => {
    const result = await useCase.execute({
      playerId: mockPlayerId,
      positionCode: 'CF',
      isPrimary: false,
    });

    expect(mockPlayerRepo.findByExternalIdentity).not.toHaveBeenCalled();
    expect(mockPosRepo.upsert).toHaveBeenCalledWith(mockPlayerId, 'CF', false);
    expect(result.playerId).toBe(mockPlayerId);
  });

  it('TC-06: should throw NotFoundException when player does not exist', async () => {
    mockPlayerRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(
      useCase.execute({
        playerExternalId: '99999',
        positionCode: 'ST',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-07: should throw BadRequestException when positionCode is missing', async () => {
    await expect(
      useCase.execute({
        playerId: mockPlayerId,
        positionCode: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-11: should execute batch positions with executeMany', async () => {
    const results = await useCase.executeMany([
      { playerId: mockPlayerId, positionCode: 'ST', isPrimary: true },
      { playerId: mockPlayerId, positionCode: 'LW', isPrimary: false },
    ]);

    expect(results).toHaveLength(2);
    expect(mockPosRepo.upsert).toHaveBeenCalledTimes(2);
  });
});
