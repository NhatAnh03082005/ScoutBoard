import { NotFoundException } from '@nestjs/common';
import {
  GetPlayerSeasonStatisticsUseCase,
  calculatePassAccuracy,
} from './get-player-season-statistics.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';

describe('GetPlayerSeasonStatisticsUseCase & Pass Accuracy Helper', () => {
  let useCase: GetPlayerSeasonStatisticsUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
      findMatchStatisticsByPlayerId: jest.fn(),
      findComparisonCandidates: jest.fn(),
    };

    useCase = new GetPlayerSeasonStatisticsUseCase(mockPlayerRepo);
  });

  describe('calculatePassAccuracy', () => {
    it('CASE 1: attempted = 100, completed = 80 -> accuracy = 80', () => {
      expect(calculatePassAccuracy(80, 100)).toBe(80);
    });

    it('CASE 2: attempted = 10, completed = 9 -> accuracy = 90', () => {
      expect(calculatePassAccuracy(9, 10)).toBe(90);
    });

    it('CASE 3: attempted = 0, completed = 0 -> accuracy = null', () => {
      expect(calculatePassAccuracy(0, 0)).toBeNull();
    });

    it('CASE 4: attempted = 70, completed = 60 -> accuracy = 85.71', () => {
      expect(calculatePassAccuracy(60, 70)).toBe(85.71);
    });

    it('CASE 5: invalid inputs -> returns null', () => {
      expect(calculatePassAccuracy(-5, 10)).toBeNull();
      expect(calculatePassAccuracy(10, -10)).toBeNull();
    });
  });

  it('should throw NotFoundException if player does not exist', async () => {
    mockPlayerRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPlayerRepo.findById).toHaveBeenCalledWith('invalid-id');
  });

  it('should return empty array if player exists but has no statistics', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([]);

    const result = await useCase.execute('player-1');

    expect(result).toEqual([]);
    expect(mockPlayerRepo.findSeasonStatisticsByPlayerId).toHaveBeenCalledWith('player-1');
  });

  it('should calculate goalsPer90 = 1 and passAccuracy = 80 when attempted = 500, completed = 400', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([
      {
        id: 'stat-1',
        matchesPlayed: 10,
        starts: 10,
        minutesPlayed: 900,
        goals: 10,
        assists: 5,
        shots: 30,
        shotsOnTarget: 15,
        passesAttempted: 500,
        passesCompleted: 400,
        keyPasses: 20,
        tackles: 10,
        interceptions: 5,
        duelsWon: 40,
        season: { id: 's-1', seasonCode: '2025-2026', isCurrent: true },
        competition: { id: 'c-1', name: 'Premier League', country: 'England' },
        team: { id: 't-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
      } as any,
    ]);

    const result = await useCase.execute('player-1');

    expect(result[0].goalsPer90).toBe(1);
    expect(result[0].passesAttempted).toBe(500);
    expect(result[0].passesCompleted).toBe(400);
    expect(result[0].passAccuracy).toBe(80);
    expect(result[0].passesPer90).toBe(50);
  });

  it('should return null for all per90 metrics and passAccuracy when minutesPlayed = 0 and passesAttempted = 0', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([
      {
        id: 'stat-3',
        matchesPlayed: 0,
        starts: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        keyPasses: 0,
        tackles: 0,
        interceptions: 0,
        duelsWon: 0,
        season: { id: 's-1', seasonCode: '2025-2026', isCurrent: true },
        competition: { id: 'c-1', name: 'Premier League', country: 'England' },
        team: { id: 't-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
      } as any,
    ]);

    const result = await useCase.execute('player-1');

    expect(result[0].passAccuracy).toBeNull();
    expect(result[0].passesPer90).toBeNull();
  });
});
