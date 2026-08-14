import { NotFoundException } from '@nestjs/common';
import { GetPlayerSeasonStatisticsUseCase } from './get-player-season-statistics.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';

describe('GetPlayerSeasonStatisticsUseCase', () => {
  let useCase: GetPlayerSeasonStatisticsUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
    };

    useCase = new GetPlayerSeasonStatisticsUseCase(mockPlayerRepo);
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

  it('should calculate goalsPer90 = 1 when minutesPlayed = 900 and goals = 10', async () => {
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
        passes: 400,
        passAccuracy: 85,
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
    expect(result[0].goals).toBe(10);
  });

  it('should calculate assistsPer90 = 0.5 when minutesPlayed = 1800 and assists = 10', async () => {
    mockPlayerRepo.findById.mockResolvedValue({ id: 'player-1', name: 'Saka' } as any);
    mockPlayerRepo.findSeasonStatisticsByPlayerId.mockResolvedValue([
      {
        id: 'stat-2',
        matchesPlayed: 20,
        starts: 20,
        minutesPlayed: 1800,
        goals: 5,
        assists: 10,
        shots: 40,
        shotsOnTarget: 20,
        passes: 800,
        passAccuracy: 88,
        keyPasses: 30,
        tackles: 15,
        interceptions: 10,
        duelsWon: 50,
        season: { id: 's-1', seasonCode: '2025-2026', isCurrent: true },
        competition: { id: 'c-1', name: 'Premier League', country: 'England' },
        team: { id: 't-1', name: 'Arsenal FC', shortName: 'Arsenal', logoUrl: null },
      } as any,
    ]);

    const result = await useCase.execute('player-1');

    expect(result[0].assistsPer90).toBe(0.5);
    expect(result[0].assists).toBe(10);
  });

  it('should return null for all per90 metrics when minutesPlayed = 0 (avoiding NaN or Infinity)', async () => {
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
        passes: 0,
        passAccuracy: null,
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

    expect(result[0].goalsPer90).toBeNull();
    expect(result[0].assistsPer90).toBeNull();
    expect(result[0].shotsPer90).toBeNull();
    expect(result[0].passesPer90).toBeNull();
    expect(result[0].keyPassesPer90).toBeNull();
    expect(result[0].tacklesPer90).toBeNull();
  });
});
