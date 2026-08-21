import { NotFoundException } from '@nestjs/common';
import {
  GetPlayerSeasonStatisticsUseCase,
  calculatePassAccuracy,
  calculatePer90,
} from './get-player-season-statistics.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';

describe('GetPlayerSeasonStatisticsUseCase & Metric Helpers', () => {
  let useCase: GetPlayerSeasonStatisticsUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
      findSeasonStatisticsByCompetitionAndSeason: jest.fn().mockResolvedValue([]),
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

  describe('calculatePer90', () => {
    it('should calculate per 90 correctly', () => {
      expect(calculatePer90(10, 900)).toBe(1);
      expect(calculatePer90(5, 900)).toBe(0.5);
      expect(calculatePer90(0, 900)).toBe(0);
    });

    it('should return null for invalid inputs or 0 minutes', () => {
      expect(calculatePer90(null, 900)).toBeNull();
      expect(calculatePer90(undefined, 900)).toBeNull();
      expect(calculatePer90(10, 0)).toBeNull();
      expect(calculatePer90(10, -50)).toBeNull();
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

  it('should calculate goalsPer90 = 1 and passAccuracy = 80 for outfield player', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([
      {
        id: 'stat-1',
        seasonId: 's-1',
        competitionId: 'c-1',
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
    expect(result[0].assistsPer90).toBe(0.5);
    expect(result[0].shotsPer90).toBe(3);
    expect(result[0].shotsOnTargetPer90).toBe(1.5);
    expect(result[0].passesAttempted).toBe(500);
    expect(result[0].passesCompleted).toBe(400);
    expect(result[0].passAccuracy).toBe(80);
    expect(result[0].passesPer90).toBe(50);
    expect(result[0].keyPassesPer90).toBe(2);
    expect(result[0].tacklesPer90).toBe(1);
    expect(result[0].interceptionsPer90).toBe(0.5);
    expect(result[0].duelsWonPer90).toBe(4);
    // Verify GK fields on outfield player are null
    expect(result[0].saves).toBeNull();
    expect(result[0].goalsConceded).toBeNull();
    expect(result[0].cleanSheets).toBeNull();
    expect(result[0].penaltiesSaved).toBeNull();
    expect(result[0].savesPer90).toBeNull();
  });

  it('CASE: Goalkeeper season statistics & GK per-90 calculation', async () => {
    mockPlayerRepo.findById.mockResolvedValue({
      id: 'gk-1',
      name: 'David Raya',
      primaryPosition: 'GK',
    } as any);

    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([
      {
        id: 'stat-gk-1',
        seasonId: 's-1',
        competitionId: 'c-1',
        matchesPlayed: 10,
        starts: 10,
        minutesPlayed: 900,
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        passesAttempted: 300,
        passesCompleted: 240,
        keyPasses: 0,
        tackles: 0,
        interceptions: 2,
        duelsWon: 5,
        saves: 30,
        goalsConceded: 8,
        cleanSheets: 5,
        penaltiesSaved: 1,
        penaltiesFaced: 2,
        savePercentage: 78.9,
        season: { id: 's-1', seasonCode: '2025-2026', isCurrent: true },
        competition: { id: 'c-1', name: 'Premier League', country: 'England' },
        team: { id: 't-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
      } as any,
    ]);

    const result = await useCase.execute('gk-1');

    expect(result[0].saves).toBe(30);
    expect(result[0].goalsConceded).toBe(8);
    expect(result[0].cleanSheets).toBe(5);
    expect(result[0].penaltiesSaved).toBe(1);
    expect(result[0].penaltiesFaced).toBe(2);
    expect(result[0].savesPer90).toBe(3); // 30 * 90 / 900 = 3.00
    expect(result[0].goalsConcededPer90).toBe(0.8); // 8 * 90 / 900 = 0.80
    expect(result[0].savePercentage).toBe(78.9);
    expect(result[0].cleanSheetPercentage).toBe(50); // 5 / 10 * 100 = 50%
  });
});
