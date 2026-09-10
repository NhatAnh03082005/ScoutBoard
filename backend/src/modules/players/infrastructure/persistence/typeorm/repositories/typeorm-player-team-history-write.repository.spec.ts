import { Repository } from 'typeorm';
import { TypeOrmPlayerTeamHistoryWriteRepository } from './typeorm-player-team-history-write.repository';
import { PlayerTeamHistoryOrmEntity } from '../entities/player-team-history.orm-entity';
import { PlayerOrmEntity } from '../entities/player.orm-entity';

describe('TypeOrmPlayerTeamHistoryWriteRepository', () => {
  let repository: TypeOrmPlayerTeamHistoryWriteRepository;
  let mockHistoryRepo: jest.Mocked<Repository<PlayerTeamHistoryOrmEntity>>;
  let mockPlayerRepo: jest.Mocked<Repository<PlayerOrmEntity>>;

  const mockPlayerId = 'player-uuid-1';
  const mockTeamId = 'team-uuid-1';

  const mockHistoryEntity: PlayerTeamHistoryOrmEntity = {
    id: 'history-uuid-1',
    playerId: mockPlayerId,
    teamId: mockTeamId,
    startDate: '2021-08-01',
    endDate: null,
    shirtNumber: 7,
    isCurrent: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    player: null as any,
    team: null as any,
  };

  beforeEach(() => {
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockHistoryRepo = {
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

    repository = new TypeOrmPlayerTeamHistoryWriteRepository(
      mockHistoryRepo,
      mockPlayerRepo,
    );
  });

  it('TC-01: should insert new history record when not found in DB', async () => {
    mockHistoryRepo.findOne.mockResolvedValue(null);
    mockHistoryRepo.create.mockReturnValue(mockHistoryEntity);
    mockHistoryRepo.save.mockResolvedValue(mockHistoryEntity);

    const result = await repository.upsert({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2021-08-01',
      endDate: null,
      shirtNumber: 7,
      isCurrent: true,
    });

    expect(mockHistoryRepo.findOne).toHaveBeenCalled();
    expect(mockHistoryRepo.create).toHaveBeenCalledWith({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2021-08-01',
      endDate: null,
      shirtNumber: 7,
      isCurrent: true,
    });
    expect(mockHistoryRepo.save).toHaveBeenCalledWith(mockHistoryEntity);
    expect(mockPlayerRepo.update).toHaveBeenCalledWith(
      { id: mockPlayerId },
      { currentTeamId: mockTeamId },
    );
    expect(result).toBe(mockHistoryEntity);
  });

  it('TC-02 & TC-03: should update existing history record idempotently without duplicates', async () => {
    const existing: PlayerTeamHistoryOrmEntity = {
      ...mockHistoryEntity,
      shirtNumber: 9,
    };
    mockHistoryRepo.findOne.mockResolvedValue(existing);
    mockHistoryRepo.save.mockImplementation(
      async (e) => e as PlayerTeamHistoryOrmEntity,
    );

    const result = await repository.upsert({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2021-08-01',
      endDate: null,
      shirtNumber: 7,
      isCurrent: true,
    });

    expect(mockHistoryRepo.create).not.toHaveBeenCalled();
    expect(existing.shirtNumber).toBe(7);
    expect(result.shirtNumber).toBe(7);
  });

  it('TC-04: should return all history records for a player ordered by isCurrent and startDate', async () => {
    mockHistoryRepo.find.mockResolvedValue([mockHistoryEntity]);

    const results = await repository.findByPlayerId(mockPlayerId);

    expect(mockHistoryRepo.find).toHaveBeenCalledWith({
      where: { playerId: mockPlayerId },
      order: { isCurrent: 'DESC', startDate: 'DESC' },
    });
    expect(results).toHaveLength(1);
  });

  it('TC-05: should support multiple spells for the same team with distinct startDate', async () => {
    mockHistoryRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockHistoryRepo.create.mockImplementation(
      (e) => ({ ...e, id: 'gen-id' }) as any,
    );
    mockHistoryRepo.save.mockImplementation(
      async (e) => e as PlayerTeamHistoryOrmEntity,
    );

    const spell1 = await repository.upsert({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2018-01-01',
      endDate: '2020-12-31',
      isCurrent: false,
    });

    const spell2 = await repository.upsert({
      playerId: mockPlayerId,
      teamId: mockTeamId,
      startDate: '2024-01-01',
      endDate: null,
      isCurrent: true,
    });

    expect(spell1.startDate).toBe('2018-01-01');
    expect(spell2.startDate).toBe('2024-01-01');
  });

  it('TC-16: should batch upsert history records and deduplicate input', async () => {
    mockHistoryRepo.findOne.mockResolvedValue(null);
    mockHistoryRepo.create.mockImplementation(
      (e) => ({ ...e, id: 'gen-id' }) as any,
    );
    mockHistoryRepo.save.mockImplementation(
      async (e) => e as PlayerTeamHistoryOrmEntity,
    );

    const results = await repository.upsertMany([
      {
        playerId: mockPlayerId,
        teamId: 'team-1',
        startDate: '2015-01-01',
        isCurrent: false,
      },
      {
        playerId: mockPlayerId,
        teamId: 'team-1',
        startDate: '2015-01-01',
        isCurrent: false,
      }, // duplicate
      {
        playerId: mockPlayerId,
        teamId: 'team-2',
        startDate: '2021-01-01',
        isCurrent: true,
      },
    ]);

    expect(results).toHaveLength(2);
  });
});
