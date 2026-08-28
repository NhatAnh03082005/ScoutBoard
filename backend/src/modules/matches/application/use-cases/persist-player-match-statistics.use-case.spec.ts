import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PersistPlayerMatchStatisticsUseCase } from './persist-player-match-statistics.use-case';
import { PlayerMatchStatisticWriteRepository } from '../ports/player-match-statistic-write.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('PersistPlayerMatchStatisticsUseCase', () => {
  let useCase: PersistPlayerMatchStatisticsUseCase;
  let mockStatRepo: jest.Mocked<PlayerMatchStatisticWriteRepository>;
  let mockMatchRepo: any;
  let mockPlayerRepo: any;

  const matchId = 'match-uuid-1';
  const playerId = 'player-uuid-1';
  const homeTeamId = 'home-team-uuid';
  const awayTeamId = 'away-team-uuid';

  const mockMatch = {
    id: matchId,
    homeTeamId,
    awayTeamId,
  } as MatchOrmEntity;

  const mockPlayer = {
    id: playerId,
    name: 'Cristiano Ronaldo',
  } as PlayerOrmEntity;

  beforeEach(() => {
    mockStatRepo = {
      findByMatchAndPlayer: jest.fn(),
      findByMatchId: jest.fn(),
      upsert: jest.fn((dto) => Promise.resolve({ ...dto, id: 'stat-uuid-1' } as any)),
      upsertBatch: jest.fn(),
      deleteByMatchId: jest.fn(),
    };

    mockMatchRepo = {
      findOne: jest.fn(),
    };

    mockPlayerRepo = {
      findOne: jest.fn(),
    };

    useCase = new PersistPlayerMatchStatisticsUseCase(
      mockStatRepo,
      mockMatchRepo,
      mockPlayerRepo,
    );
  });

  it('should persist statistic when match, player, and team are valid', async () => {
    mockMatchRepo.findOne.mockResolvedValueOnce(mockMatch);
    mockPlayerRepo.findOne.mockResolvedValueOnce(mockPlayer);

    const result = await useCase.execute({
      matchId,
      playerId,
      teamId: homeTeamId,
      goals: 2,
    });

    expect(result.goals).toBe(2);
    expect(mockStatRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ matchId, playerId, teamId: homeTeamId, goals: 2 }),
    );
  });

  it('should throw NotFoundException when canonical match does not exist', async () => {
    mockMatchRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        matchId: 'non-existent-match',
        playerId,
        teamId: homeTeamId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when canonical player does not exist', async () => {
    mockMatchRepo.findOne.mockResolvedValueOnce(mockMatch);
    mockPlayerRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        matchId,
        playerId: 'non-existent-player',
        teamId: homeTeamId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when team does not belong to match', async () => {
    mockMatchRepo.findOne.mockResolvedValueOnce(mockMatch);
    mockPlayerRepo.findOne.mockResolvedValueOnce(mockPlayer);

    await expect(
      useCase.execute({
        matchId,
        playerId,
        teamId: 'wrong-team-uuid-xyz',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle batch persistence with error isolation', async () => {
    mockMatchRepo.findOne.mockResolvedValue(mockMatch);
    mockPlayerRepo.findOne
      .mockResolvedValueOnce(mockPlayer) // Player 1 valid
      .mockResolvedValueOnce(null); // Player 2 not found

    const batchResult = await useCase.executeBatch(matchId, [
      { matchId, playerId: 'player-1', teamId: homeTeamId, goals: 1 },
      { matchId, playerId: 'player-unknown', teamId: homeTeamId, goals: 0 },
    ]);

    expect(batchResult.total).toBe(2);
    expect(batchResult.persisted).toBe(1);
    expect(batchResult.skipped).toBe(1);
    expect(batchResult.errors[0].playerId).toBe('player-unknown');
  });
});
