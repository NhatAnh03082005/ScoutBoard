import { PlayerMatchStatisticOrmEntity } from '../../../matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

export interface AggregatedSeasonStats {
  matchesPlayed: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  keyPasses: number;
  passesAttempted: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
  duelsWon: number;
  advancedStatistics: Record<string, any> | null;

  goalsPer90: number | null;
  assistsPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;

  // Goalkeeper Specific (Null for outfield players)
  saves: number | null;
  goalsConceded: number | null;
  cleanSheets: number | null;
  penaltiesSaved: number | null;
  penaltiesFaced: number | null;
  savesPer90: number | null;
  goalsConcededPer90: number | null;
  savePercentage: number | null;
}

export class PlayerSeasonStatisticsAggregator {
  /**
   * Pure deterministic aggregation from trusted match statistics into season summary
   */
  static aggregate(matchStats: PlayerMatchStatisticOrmEntity[]): AggregatedSeasonStats {
    const list = Array.isArray(matchStats) ? matchStats : [];

    let matchesPlayed = 0;
    let starts = 0;
    let minutesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let shots = 0;
    let shotsOnTarget = 0;
    let keyPasses = 0;
    let passesAttempted = 0;
    let passesCompleted = 0;
    let tackles = 0;
    let interceptions = 0;
    let yellowCards = 0;
    let redCards = 0;
    let duelsWon = 0;

    let hasGkStats = false;
    let saves = 0;
    let goalsConceded = 0;
    let cleanSheets = 0;
    let penaltiesSaved = 0;
    let penaltiesFaced = 0;

    const mergedAdvancedStats: Record<string, any> = {};

    for (const stat of list) {
      if (!stat) continue;

      matchesPlayed += 1;
      if (stat.isStarter) starts += 1;
      minutesPlayed += stat.minutesPlayed ?? 0;
      goals += stat.goals ?? 0;
      assists += stat.assists ?? 0;
      shots += stat.shots ?? 0;
      keyPasses += stat.keyPasses ?? 0;
      passesAttempted += stat.passesAttempted ?? 0;
      passesCompleted += stat.passesCompleted ?? 0;
      tackles += stat.tackles ?? 0;
      interceptions += stat.interceptions ?? 0;
      yellowCards += stat.yellowCards ?? 0;
      redCards += stat.redCards ?? 0;

      // Extract extended JSONB stats if present
      if (stat.statistics && typeof stat.statistics === 'object') {
        if (typeof stat.statistics.shotsOnTarget === 'number') {
          shotsOnTarget += stat.statistics.shotsOnTarget;
        }
        if (typeof stat.statistics.duelsWon === 'number') {
          duelsWon += stat.statistics.duelsWon;
        }
        if (typeof stat.statistics.penaltiesFaced === 'number') {
          penaltiesFaced += stat.statistics.penaltiesFaced;
        }
        Object.assign(mergedAdvancedStats, stat.statistics);
      }

      // Check Goalkeeper statistics
      if (
        stat.saves !== null ||
        stat.goalsConceded !== null ||
        stat.cleanSheets !== null ||
        stat.penaltiesSaved !== null
      ) {
        hasGkStats = true;
        saves += stat.saves ?? 0;
        goalsConceded += stat.goalsConceded ?? 0;
        cleanSheets += stat.cleanSheets ?? 0;
        penaltiesSaved += stat.penaltiesSaved ?? 0;
      }
    }

    // Per-90 Calculation: ONLY when minutes_played > 0
    let goalsPer90: number | null = null;
    let assistsPer90: number | null = null;
    let keyPassesPer90: number | null = null;
    let tacklesPer90: number | null = null;
    let interceptionsPer90: number | null = null;
    let savesPer90: number | null = null;
    let goalsConcededPer90: number | null = null;

    if (minutesPlayed > 0) {
      const per90Factor = 90 / minutesPlayed;
      goalsPer90 = this.roundToTwoDecimals(goals * per90Factor);
      assistsPer90 = this.roundToTwoDecimals(assists * per90Factor);
      keyPassesPer90 = this.roundToTwoDecimals(keyPasses * per90Factor);
      tacklesPer90 = this.roundToTwoDecimals(tackles * per90Factor);
      interceptionsPer90 = this.roundToTwoDecimals(interceptions * per90Factor);

      if (hasGkStats) {
        savesPer90 = this.roundToTwoDecimals(saves * per90Factor);
        goalsConcededPer90 = this.roundToTwoDecimals(goalsConceded * per90Factor);
      }
    }


    // GK Save Percentage Calculation: only when (saves + goalsConceded) > 0
    let savePercentage: number | null = null;
    if (hasGkStats) {
      const totalFaced = saves + goalsConceded;
      if (totalFaced > 0) {
        savePercentage = this.roundToTwoDecimals((saves / totalFaced) * 100);
      }
    }

    return {
      matchesPlayed,
      starts,
      minutesPlayed,
      goals,
      assists,
      shots,
      shotsOnTarget,
      keyPasses,
      passesAttempted,
      passesCompleted,
      tackles,
      interceptions,
      yellowCards,
      redCards,
      duelsWon,
      advancedStatistics: Object.keys(mergedAdvancedStats).length > 0 ? mergedAdvancedStats : null,

      goalsPer90,
      assistsPer90,
      keyPassesPer90,
      tacklesPer90,
      interceptionsPer90,

      saves: hasGkStats ? saves : null,
      goalsConceded: hasGkStats ? goalsConceded : null,
      cleanSheets: hasGkStats ? cleanSheets : null,
      penaltiesSaved: hasGkStats ? penaltiesSaved : null,
      penaltiesFaced: hasGkStats ? penaltiesFaced : null,
      savesPer90,
      goalsConcededPer90,
      savePercentage,
    };
  }

  private static roundToTwoDecimals(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }
}
