import { PlayerSeasonStatisticsAggregator } from './player-season-statistics.aggregator';
import { PlayerMatchStatisticOrmEntity } from '../../../matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

describe('PlayerSeasonStatisticsAggregator (Pure Domain & Metric Invariants)', () => {
  it('TC-01: should aggregate a single match correctly', () => {
    const singleMatch: PlayerMatchStatisticOrmEntity = {
      id: 'stat-1',
      matchId: 'match-1',
      playerId: 'player-1',
      teamId: 'team-1',
      minutesPlayed: 90,
      isStarter: true,
      goals: 2,
      assists: 1,
      shots: 4,
      keyPasses: 3,
      passesAttempted: 50,
      passesCompleted: 45,
      tackles: 2,
      interceptions: 1,
      yellowCards: 0,
      redCards: 0,
      saves: null,
      goalsConceded: null,
      cleanSheets: null,
      penaltiesSaved: null,
      statistics: { shotsOnTarget: 3, duelsWon: 5 },
    } as any;

    const result = PlayerSeasonStatisticsAggregator.aggregate([singleMatch]);

    expect(result.matchesPlayed).toBe(1);
    expect(result.starts).toBe(1);
    expect(result.minutesPlayed).toBe(90);
    expect(result.goals).toBe(2);
    expect(result.assists).toBe(1);
    expect(result.shots).toBe(4);
    expect(result.shotsOnTarget).toBe(3);
    expect(result.keyPasses).toBe(3);
    expect(result.passesAttempted).toBe(50);
    expect(result.passesCompleted).toBe(45);
    expect(result.duelsWon).toBe(5);

    // Per-90 for 90 minutes
    expect(result.goalsPer90).toBe(2.0);
    expect(result.assistsPer90).toBe(1.0);
    expect(result.keyPassesPer90).toBe(3.0);
    expect(result.tacklesPer90).toBe(2.0);
    expect(result.interceptionsPer90).toBe(1.0);

    // Outfield GK invariants: all null
    expect(result.saves).toBeNull();
    expect(result.goalsConceded).toBeNull();
    expect(result.cleanSheets).toBeNull();
    expect(result.savesPer90).toBeNull();
    expect(result.savePercentage).toBeNull();
  });

  it('TC-02: should aggregate multiple matches with accurate Per-90 metrics', () => {
    const match1: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 90,
      isStarter: true,
      goals: 1,
      assists: 1,
      keyPasses: 2,
      tackles: 3,
      interceptions: 1,
      passesAttempted: 40,
      passesCompleted: 35,
      saves: null,
      goalsConceded: null,
    } as any;

    const match2: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 45,
      isStarter: false,
      goals: 1,
      assists: 0,
      keyPasses: 1,
      tackles: 1,
      interceptions: 0,
      passesAttempted: 20,
      passesCompleted: 15,
      saves: null,
      goalsConceded: null,
    } as any;

    const result = PlayerSeasonStatisticsAggregator.aggregate([match1, match2]);

    expect(result.matchesPlayed).toBe(2);
    expect(result.starts).toBe(1);
    expect(result.minutesPlayed).toBe(135);
    expect(result.goals).toBe(2);
    expect(result.assists).toBe(1);

    // Per-90 calculation: (goals / minutes) * 90 = (2 / 135) * 90 = 1.33
    expect(result.goalsPer90).toBe(1.33);
    // (assists / 135) * 90 = 0.67
    expect(result.assistsPer90).toBe(0.67);
  });

  it('TC-03: should return null for per-90 values when player has 0 minutes', () => {
    const benchUnplayed: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 0,
      isStarter: false,
      goals: 0,
      assists: 0,
      saves: null,
      goalsConceded: null,
    } as any;

    const result = PlayerSeasonStatisticsAggregator.aggregate([benchUnplayed]);

    expect(result.matchesPlayed).toBe(1);
    expect(result.starts).toBe(0);
    expect(result.minutesPlayed).toBe(0);
    expect(result.goalsPer90).toBeNull();
    expect(result.assistsPer90).toBeNull();
    expect(result.keyPassesPer90).toBeNull();
    expect(result.tacklesPer90).toBeNull();
    expect(result.interceptionsPer90).toBeNull();
  });

  it('TC-04: should accurately aggregate Goalkeeper statistics and save percentages', () => {
    const gkMatch1: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 90,
      isStarter: true,
      saves: 4,
      goalsConceded: 1,
      cleanSheets: 0,
      penaltiesSaved: 1,
      statistics: { penaltiesFaced: 1 },
    } as any;

    const gkMatch2: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 90,
      isStarter: true,
      saves: 6,
      goalsConceded: 0,
      cleanSheets: 1,
      penaltiesSaved: 0,
    } as any;

    const result = PlayerSeasonStatisticsAggregator.aggregate([gkMatch1, gkMatch2]);

    expect(result.matchesPlayed).toBe(2);
    expect(result.starts).toBe(2);
    expect(result.minutesPlayed).toBe(180);
    expect(result.saves).toBe(10);
    expect(result.goalsConceded).toBe(1);
    expect(result.cleanSheets).toBe(1);
    expect(result.penaltiesSaved).toBe(1);
    expect(result.penaltiesFaced).toBe(1);

    // Saves per 90: (10 / 180) * 90 = 5.00
    expect(result.savesPer90).toBe(5.0);
    // Goals conceded per 90: (1 / 180) * 90 = 0.50
    expect(result.goalsConcededPer90).toBe(0.5);
    // Save percentage: (saves / (saves + goalsConceded)) * 100 = (10 / 11) * 100 = 90.91%
    expect(result.savePercentage).toBe(90.91);
  });

  it('TC-05: should return null save percentage if goalkeeper faced 0 shots and conceded 0', () => {
    const quietMatch: PlayerMatchStatisticOrmEntity = {
      minutesPlayed: 90,
      isStarter: true,
      saves: 0,
      goalsConceded: 0,
      cleanSheets: 1,
    } as any;

    const result = PlayerSeasonStatisticsAggregator.aggregate([quietMatch]);

    expect(result.saves).toBe(0);
    expect(result.goalsConceded).toBe(0);
    expect(result.savePercentage).toBeNull(); // Denominator is 0
  });
});
