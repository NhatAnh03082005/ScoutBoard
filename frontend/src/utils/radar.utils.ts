import type { PlayerSeasonStatisticItem } from '../types/player.types';

export type RadarProfile = 'GK' | 'DEF' | 'CDM' | 'CM' | 'CAM' | 'LM_RM' | 'ATT';

export interface RadarMetric {
  key: string;
  label: string; // English all-caps label
  value: number; // 0 to 100 normalized display score
  rawValue: string; // Formatted raw value for tooltip/display
}

/**
 * Normalization helper: Clamps raw value between min and max, converts to 0-100 score
 */
export function normalizeMetric(
  val: number | null | undefined,
  min: number,
  max: number,
  inverse = false,
): number {
  if (val === null || val === undefined || isNaN(val)) return 0;
  if (val <= 0 && !inverse) return 0;

  const clamped = Math.max(min, Math.min(max, val));
  let normalized = ((clamped - min) / (max - min)) * 100;
  if (inverse) {
    normalized = 100 - normalized;
  }
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

/**
 * Map canonical position code into 1 of 7 Tactical Radar Profiles.
 * Only the 15 canonical codes are accepted; all others fall back to CM.
 */
export function getRadarProfile(posCode?: string | null): RadarProfile {
  if (!posCode) return 'CM';
  const upper = posCode.trim().toUpperCase();

  // 1. Goalkeeper
  if (upper === 'GK') return 'GK';

  // 2. Defenders (canonical only)
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(upper)) return 'DEF';

  // 3. Defensive Midfielder
  if (upper === 'CDM') return 'CDM';

  // 4. Central Midfielder
  if (upper === 'CM') return 'CM';

  // 5. Attacking Midfielder
  if (upper === 'CAM') return 'CAM';

  // 6. Wide Midfielder
  if (['LM', 'RM'].includes(upper)) return 'LM_RM';

  // 7. Attacker
  if (['LW', 'RW', 'CF', 'ST'].includes(upper)) return 'ATT';

  // Fallback for unknown/null
  return 'CM';
}

/**
 * Get display title for the Radar Profile
 */
export function getRadarProfileTitle(profile: RadarProfile): string {
  switch (profile) {
    case 'GK':
      return 'GOALKEEPER';
    case 'DEF':
      return 'DEFENDER';
    case 'CDM':
      return 'DEFENSIVE MIDFIELDER';
    case 'CM':
      return 'CENTRAL MIDFIELDER';
    case 'CAM':
      return 'ATTACKING MIDFIELDER';
    case 'LM_RM':
      return 'WIDE MIDFIELDER';
    case 'ATT':
      return 'ATTACKER';
  }
}

/**
 * Unified calculator function: calculateRadarScores(playerStats, radarProfileOrPos)
 * Shared single source of truth between Player Detail Page and Player Comparison Page.
 */
export function calculateRadarScores(
  stat?: PlayerSeasonStatisticItem | any | null,
  profileOrPosCode?: RadarProfile | string | null,
): RadarMetric[] {
  return getRadarMetrics(profileOrPosCode, stat);
}

/**
 * Returns 5 position-aware tactical metrics normalized to 0-100 for the Radar Chart
 * Supports all 7 tactical profiles with English axis labels.
 */
export function getRadarMetrics(
  posCodeOrCategory?: string | null,
  stat?: PlayerSeasonStatisticItem | any | null,
): RadarMetric[] {
  if (!stat) {
    return [
      { key: 'metric1', label: 'METRIC 1', value: 0, rawValue: '—' },
      { key: 'metric2', label: 'METRIC 2', value: 0, rawValue: '—' },
      { key: 'metric3', label: 'METRIC 3', value: 0, rawValue: '—' },
      { key: 'metric4', label: 'METRIC 4', value: 0, rawValue: '—' },
      { key: 'metric5', label: 'METRIC 5', value: 0, rawValue: '—' },
    ];
  }

  // Determine profile from position code
  const profile = getRadarProfile(posCodeOrCategory);

  // Common Raw & Derived Metrics
  const minutes = stat.minutesPlayed ?? 0;
  const passAcc = stat.passAccuracy ?? (stat.passesAttempted > 0 ? (stat.passesCompleted / stat.passesAttempted) * 100 : 0);
  const passesP90 = stat.passesPer90 ?? (minutes > 0 ? (stat.passesAttempted * 90) / minutes : 0);
  const keyPassesP90 = stat.keyPassesPer90 ?? (minutes > 0 ? (stat.keyPasses * 90) / minutes : 0);
  const tacklesP90 = stat.tacklesPer90 ?? (minutes > 0 ? (stat.tackles * 90) / minutes : 0);
  const intP90 = stat.interceptionsPer90 ?? (minutes > 0 ? (stat.interceptions * 90) / minutes : 0);
  const duelsP90 = stat.duelsWonPer90 ?? (minutes > 0 ? (stat.duelsWon * 90) / minutes : 0);
  const goalsP90 = stat.goalsPer90 ?? (minutes > 0 ? (stat.goals * 90) / minutes : 0);
  const assistsP90 = stat.assistsPer90 ?? (minutes > 0 ? (stat.assists * 90) / minutes : 0);
  const shotsP90 = stat.shotsPer90 ?? (minutes > 0 ? (stat.shots * 90) / minutes : 0);
  const shotsOnTargetP90 = stat.shotsOnTargetPer90 ?? (minutes > 0 ? (stat.shotsOnTarget * 90) / minutes : 0);

  // Combined Tactical Metrics
  const ballRecovery = tacklesP90 + intP90;
  const goalThreat = goalsP90 + assistsP90;

  switch (profile) {
    // =========================================================================
    // 1. GOALKEEPER (GK)
    // =========================================================================
    case 'GK': {
      const savesP90 = stat.savesPer90 ?? (minutes > 0 && stat.saves !== null && stat.saves !== undefined ? (stat.saves * 90) / minutes : 0);
      const cleanSheets = stat.cleanSheets ?? 0;
      const gcP90 = stat.goalsConcededPer90 ?? (minutes > 0 && stat.goalsConceded !== null && stat.goalsConceded !== undefined ? (stat.goalsConceded * 90) / minutes : 1.5);
      
      const penSaved = stat.penaltiesSaved ?? 0;
      const penFaced = stat.penaltiesFaced ?? 0;
      let penSavePct: number | null = null;
      if (penFaced > 0 && stat.penaltiesSaved !== null && stat.penaltiesSaved !== undefined) {
        penSavePct = (penSaved / penFaced) * 100;
      } else if (stat.penaltySavePercentage !== null && stat.penaltySavePercentage !== undefined) {
        penSavePct = stat.penaltySavePercentage;
      }

      return [
        {
          key: 'shotStopping',
          label: 'SHOT STOPPING',
          value: normalizeMetric(savesP90, 0, 5.0),
          rawValue: savesP90 > 0 ? `${savesP90.toFixed(2)}/90` : `${stat.saves ?? 0} saves`,
        },
        {
          key: 'cleanSheets',
          label: 'CLEAN SHEETS',
          value: normalizeMetric(cleanSheets, 0, 16),
          rawValue: `${cleanSheets} CS`,
        },
        {
          key: 'distribution',
          label: 'DISTRIBUTION',
          value: normalizeMetric(passAcc, 40, 90),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'goalPrevention',
          label: 'GOAL PREVENTION',
          value: normalizeMetric(gcP90, 0.6, 2.4, true), // Lower is better
          rawValue: stat.goalsConcededPer90 !== null && stat.goalsConcededPer90 !== undefined
            ? `${stat.goalsConcededPer90.toFixed(2)} GA/90`
            : `${stat.goalsConceded ?? 0} conceded`,
        },
        {
          key: 'penaltyStopping',
          label: 'PENALTY STOPPING',
          value: penSavePct !== null ? normalizeMetric(penSavePct, 0, 100) : 0,
          rawValue: penSavePct !== null
            ? `${penSavePct.toFixed(1)}% (${penSaved}/${penFaced})`
            : (penSaved > 0 ? `${penSaved} saved` : '0% (0/0)'),
        },
      ];
    }

    // =========================================================================
    // 2. DEFENDER (CB, LB, RB, LWB, RWB)
    // =========================================================================
    case 'DEF': {
      return [
        {
          key: 'tackles',
          label: 'TACKLING',
          value: normalizeMetric(tacklesP90, 0, 3.5),
          rawValue: `${tacklesP90.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 2.5),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'duelsWon',
          label: 'DUEL ABILITY',
          value: normalizeMetric(duelsP90, 0, 7.0),
          rawValue: `${duelsP90.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 60, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'buildUp',
          label: 'BUILD-UP',
          value: normalizeMetric(passesP90, 0, 75),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
      ];
    }

    // =========================================================================
    // 3. DEFENSIVE MIDFIELDER (CDM)
    // =========================================================================
    case 'CDM': {
      return [
        {
          key: 'tackles',
          label: 'TACKLING',
          value: normalizeMetric(tacklesP90, 0, 4.0),
          rawValue: `${tacklesP90.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 3.0),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'ballRecovery',
          label: 'BALL RECOVERY',
          value: normalizeMetric(ballRecovery, 0, 6.0),
          rawValue: `${ballRecovery.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 70, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 80),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
      ];
    }

    // =========================================================================
    // 4. CENTRAL MIDFIELDER (CM)
    // =========================================================================
    case 'CM': {
      return [
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 80),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 3.0),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'ballRecovery',
          label: 'BALL RECOVERY',
          value: normalizeMetric(ballRecovery, 0, 4.5),
          rawValue: `${ballRecovery.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 0.8),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }

    // =========================================================================
    // 5. ATTACKING MIDFIELDER (CAM)
    // =========================================================================
    case 'CAM': {
      return [
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 3.5),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 92),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'assists',
          label: 'ASSISTS',
          value: normalizeMetric(assistsP90, 0, 0.6),
          rawValue: `${assistsP90.toFixed(2)}/90`,
        },
        {
          key: 'scoring',
          label: 'SCORING',
          value: normalizeMetric(goalsP90, 0, 0.7),
          rawValue: `${goalsP90.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 1.0),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }

    // =========================================================================
    // 6. WIDE MIDFIELDER (LM, RM)
    // =========================================================================
    case 'LM_RM': {
      return [
        {
          key: 'tackles',
          label: 'TACKLING',
          value: normalizeMetric(tacklesP90, 0, 3.0),
          rawValue: `${tacklesP90.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 2.2),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 92),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 2.8),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 0.9),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }

    // =========================================================================
    // 7. ATTACKER (LW, RW, CF, ST)
    // =========================================================================
    case 'ATT':
    default: {
      return [
        {
          key: 'scoring',
          label: 'SCORING',
          value: normalizeMetric(goalsP90, 0, 1.0),
          rawValue: `${goalsP90.toFixed(2)}/90`,
        },
        {
          key: 'shooting',
          label: 'SHOOTING',
          value: normalizeMetric(shotsP90, 0, 4.5),
          rawValue: `${shotsP90.toFixed(2)}/90`,
        },
        {
          key: 'onTarget',
          label: 'ON TARGET',
          value: normalizeMetric(shotsOnTargetP90, 0, 2.0),
          rawValue: `${shotsOnTargetP90.toFixed(2)}/90`,
        },
        {
          key: 'creativity',
          label: 'CHANCE CREATION',
          value: normalizeMetric(keyPassesP90, 0, 2.8),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'assists',
          label: 'ASSISTS',
          value: normalizeMetric(assistsP90, 0, 0.5),
          rawValue: `${assistsP90.toFixed(2)}/90`,
        },
      ];
    }
  }
}
