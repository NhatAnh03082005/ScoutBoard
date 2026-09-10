import { Repository } from 'typeorm';
import { TypeOrmPlayerPositionWriteRepository } from './typeorm-player-position-write.repository';
import { PlayerPositionOrmEntity } from '../entities/player-position.orm-entity';
import { PlayerOrmEntity } from '../entities/player.orm-entity';

describe('TypeOrmPlayerPositionWriteRepository', () => {
  let repository: TypeOrmPlayerPositionWriteRepository;
  let mockPosRepo: jest.Mocked<Repository<PlayerPositionOrmEntity>>;
  let mockPlayerRepo: jest.Mocked<Repository<PlayerOrmEntity>>;

  const mockPlayerId = 'player-uuid-1';
  const mockPositionEntity: PlayerPositionOrmEntity = {
    id: 'pos-uuid-1',
    playerId: mockPlayerId,
    positionCode: 'ST',
    isPrimary: true,
    player: null as any,
  };

  beforeEach(() => {
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockPosRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockPlayerRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmPlayerPositionWriteRepository(
      mockPosRepo,
      mockPlayerRepo,
    );
  });

  it('TC-01: should insert new position when not found in DB', async () => {
    mockPosRepo.findOne.mockResolvedValue(null);
    mockPosRepo.create.mockReturnValue(mockPositionEntity);
    mockPosRepo.save.mockResolvedValue(mockPositionEntity);

    const result = await repository.upsert(mockPlayerId, 'ST', true);

    expect(mockPosRepo.findOne).toHaveBeenCalledWith({
      where: { playerId: mockPlayerId, positionCode: 'ST' },
    });
    expect(mockPosRepo.create).toHaveBeenCalledWith({
      playerId: mockPlayerId,
      positionCode: 'ST',
      isPrimary: true,
    });
    expect(mockPosRepo.save).toHaveBeenCalledWith(mockPositionEntity);
    expect(mockPlayerRepo.update).toHaveBeenCalledWith(
      { id: mockPlayerId },
      { primaryPosition: 'ST' },
    );
    expect(result).toBe(mockPositionEntity);
  });

  it('TC-02 & TC-03: should update existing position idempotently without duplicates', async () => {
    const existing: PlayerPositionOrmEntity = {
      ...mockPositionEntity,
      isPrimary: false,
    };
    mockPosRepo.findOne.mockResolvedValue(existing);
    mockPosRepo.save.mockImplementation(
      async (e) => e as PlayerPositionOrmEntity,
    );

    const result = await repository.upsert(mockPlayerId, 'ST', true);

    expect(mockPosRepo.create).not.toHaveBeenCalled();
    expect(existing.isPrimary).toBe(true);
    expect(result.isPrimary).toBe(true);
  });

  it('TC-04: should allow multiple different positions for the same player', async () => {
    const cbPos: PlayerPositionOrmEntity = {
      id: 'pos-1',
      playerId: mockPlayerId,
      positionCode: 'CB',
      isPrimary: true,
      player: null as any,
    };
    const lbPos: PlayerPositionOrmEntity = {
      id: 'pos-2',
      playerId: mockPlayerId,
      positionCode: 'LB',
      isPrimary: false,
      player: null as any,
    };

    mockPosRepo.find.mockResolvedValue([cbPos, lbPos]);

    const results = await repository.findByPlayerId(mockPlayerId);

    expect(mockPosRepo.find).toHaveBeenCalledWith({
      where: { playerId: mockPlayerId },
      order: { isPrimary: 'DESC', positionCode: 'ASC' },
    });
    expect(results).toHaveLength(2);
    expect(results[0].positionCode).toBe('CB');
    expect(results[1].positionCode).toBe('LB');
  });

  it('TC-05: should enforce single-primary by unsetting other positions when isPrimary is true', async () => {
    mockPosRepo.findOne.mockResolvedValue(null);
    mockPosRepo.create.mockReturnValue(mockPositionEntity);
    mockPosRepo.save.mockResolvedValue(mockPositionEntity);

    await repository.upsert(mockPlayerId, 'ST', true);

    expect(mockPosRepo.createQueryBuilder).toHaveBeenCalled();
    expect(mockPlayerRepo.update).toHaveBeenCalledWith(
      { id: mockPlayerId },
      { primaryPosition: 'ST' },
    );
  });

  it('TC-08 & TC-09: should batch upsert positions and deduplicate items in input', async () => {
    mockPosRepo.findOne.mockResolvedValue(null);
    mockPosRepo.create.mockImplementation(
      (e) => ({ ...e, id: 'pos-gen' }) as any,
    );
    mockPosRepo.save.mockImplementation(
      async (e) => e as PlayerPositionOrmEntity,
    );

    const results = await repository.upsertMany([
      { playerId: mockPlayerId, positionCode: 'CB', isPrimary: true },
      { playerId: mockPlayerId, positionCode: 'CB', isPrimary: true }, // duplicate
      { playerId: mockPlayerId, positionCode: 'LB', isPrimary: false },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].positionCode).toBe('CB');
    expect(results[1].positionCode).toBe('LB');
  });

  it('should find position by player and position code', async () => {
    mockPosRepo.findOne.mockResolvedValue(mockPositionEntity);

    const result = await repository.findByPlayerAndPosition(mockPlayerId, 'ST');

    expect(mockPosRepo.findOne).toHaveBeenCalledWith({
      where: { playerId: mockPlayerId, positionCode: 'ST' },
    });
    expect(result).toBe(mockPositionEntity);
  });
});
