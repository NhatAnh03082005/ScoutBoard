import { BadRequestException } from '@nestjs/common';
import { TypeOrmPlayerMatchStatisticWriteRepository } from './typeorm-player-match-statistic-write.repository';
import { PlayerMatchStatisticOrmEntity } from '../entities/player-match-statistic.orm-entity';

describe('TypeOrmPlayerMatchStatisticWriteRepository', () => {
  let repository: TypeOrmPlayerMatchStatisticWriteRepository;
  let mockTypeOrmRepo: any;

  const matchId = 'match-uuid-1';
  const playerId = 'player-uuid-1';
  const teamId = 'team-uuid-1';

  beforeEach(() => {
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({
        ...dto,
        id: 'stat-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 'stat-uuid-1' }),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    repository = new TypeOrmPlayerMatchStatisticWriteRepository(
      mockTypeOrmRepo,
    );
  });

  it('should insert outfield statistics with strict null GK fields', async () => {
    mockTypeOrmRepo.findOne.mockResolvedValueOnce(null);

    const result = await repository.upsert({
      matchId,
      playerId,
      teamId,
      minutesPlayed: 90,
      isStarter: true,
      rating: 8.5,
      goals: 2,
      assists: 1,
      shots: 4,
      passesAttempted: 50,
      passesCompleted: 45,
      saves: null,
      goalsConceded: null,
      cleanSheets: null,
      penaltiesSaved: null,
      statistics: { duelsWon: 7 },
    });

    expect(result.goals).toBe(2);
    expect(result.saves).toBeNull();
    expect(result.statistics?.duelsWon).toBe(7);
    expect(mockTypeOrmRepo.save).toHaveBeenCalled();
  });

  it('should insert GK statistics with saves and clean sheets', async () => {
    mockTypeOrmRepo.findOne.mockResolvedValueOnce(null);

    const result = await repository.upsert({
      matchId,
      playerId,
      teamId,
      minutesPlayed: 90,
      isStarter: true,
      rating: 7.2,
      saves: 5,
      goalsConceded: 1,
      cleanSheets: 0,
      penaltiesSaved: 1,
    });

    expect(result.saves).toBe(5);
    expect(result.goalsConceded).toBe(1);
    expect(result.cleanSheets).toBe(0);
  });

  it('should update existing statistics idempotently', async () => {
    const existing = {
      id: 'stat-uuid-1',
      matchId,
      playerId,
      teamId,
      minutesPlayed: 60,
      goals: 1,
    } as PlayerMatchStatisticOrmEntity;

    mockTypeOrmRepo.findOne.mockResolvedValueOnce(existing);

    const result = await repository.upsert({
      matchId,
      playerId,
      teamId,
      minutesPlayed: 90,
      goals: 2,
    });

    expect(result.minutesPlayed).toBe(90);
    expect(result.goals).toBe(2);
  });

  it('should reject passesCompleted > passesAttempted with BadRequestException', async () => {
    await expect(
      repository.upsert({
        matchId,
        playerId,
        teamId,
        passesAttempted: 30,
        passesCompleted: 35, // Invalid!
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should batch upsert multiple player statistics', async () => {
    mockTypeOrmRepo.findOne.mockResolvedValue(null);

    const results = await repository.upsertBatch([
      { matchId, playerId: 'p1', teamId, goals: 1 },
      { matchId, playerId: 'p2', teamId, goals: 0 },
    ]);

    expect(results).toHaveLength(2);
  });
});
