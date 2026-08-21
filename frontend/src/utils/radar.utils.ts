import type { PlayerSeasonStatisticItem } from '../types/player.types';
import type { PositionCategory } from './position.utils';

export interface RadarMetric {
  key: string;
  label: string;
  value: number; // 0 to 100 normalized display score
  rawValue: string; // Formatted raw value for tooltip/display
}

// Normalization helper: Clamps raw value between min and max, converts to 0-100 score
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
 * Returns 5 position-aware tactical metrics normalized to 0-100 for the Radar Chart
 */
export function getRadarMetrics(
  category: PositionCategory,
  stat?: PlayerSeasonStatisticItem | null,
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

  switch (category) {
    case 'GK': {
      // 1. Shot Stopping (Saves/90: scale 0 to 5.0)
      const savesP90 = stat.savesPer90 ?? 0;
      // 2. Clean Sheets (Clean Sheets: scale 0 to 18)
      const cs = stat.cleanSheets ?? 0;
      // 3. Distribution (Pass Accuracy: scale 40% to 90%)
      const passAcc = stat.passAccuracy ?? 0;
      // 4. Conceded Prevention (Goals Conceded/90: scale 0.5 to 2.5, inverse)
      const gcP90 = stat.goalsConcededPer90 ?? 1.5;
      // 5. Penalty Saving (Penalties Saved: scale 0 to 3)
      const penSaved = stat.penaltiesSaved ?? 0;

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
          value: normalizeMetric(cs, 0, 16),
          rawValue: `${cs} clean sheets`,
        },
        {
          key: 'distribution',
          label: 'DISTRIBUTION',
          value: normalizeMetric(passAcc, 40, 90),
          rawValue: `${passAcc.toFixed(1)}% acc`,
        },
        {
          key: 'concededPrevention',
          label: 'GOAL PREVENTION',
          value: normalizeMetric(gcP90, 0.6, 2.4, true),
          rawValue: stat.goalsConcededPer90 !== null && stat.goalsConcededPer90 !== undefined
            ? `${stat.goalsConcededPer90.toFixed(2)} GA/90`
            : `${stat.goalsConceded ?? 0} conceded`,
        },
        {
          key: 'penaltyStopping',
          label: 'PENALTY STOPPING',
          value: normalizeMetric(penSaved, 0, 3),
          rawValue: `${penSaved} saved`,
        },
      ];
    }

    case 'DEF': {
      // 1. Tackling (Tackles/90: scale 0 to 3.5)
      const tacklesP90 = stat.tacklesPer90 ?? 0;
      // 2. Interceptions (Interceptions/90: scale 0 to 2.5)
      const intP90 = stat.interceptionsPer90 ?? 0;
      // 3. Duel Ability (Duels Won/90: scale 0 to 7.0)
      const duelsP90 = stat.duelsWonPer90 ?? 0;
      // 4. Pass Accuracy (scale 60% to 95%)
      const passAcc = stat.passAccuracy ?? 0;
      // 5. Build-Up Passing (Passes/90: scale 0 to 75)
      const passesP90 = stat.passesPer90 ?? 0;

      return [
        {
          key: 'tackling',
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
          key: 'duels',
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
          key: 'buildUpPassing',
          label: 'BUILD-UP',
          value: normalizeMetric(passesP90, 0, 75),
          rawValue: `${passesP90.toFixed(1)} passes/90`,
        },
      ];
    }

    case 'ATT': {
      // 1. Scoring (Goals/90: scale 0 to 1.0)
      const goalsP90 = stat.goalsPer90 ?? 0;
      // 2. Shooting Volume (Shots/90: scale 0 to 4.5)
      const shotsP90 = stat.shotsPer90 ?? 0;
      // 3. Shot Accuracy (Shots on Target/90: scale 0 to 2.0)
      const sotP90 = stat.shotsOnTargetPer90 ?? 0;
      // 4. Chance Creation (Key Passes/90: scale 0 to 2.8)
      const kpP90 = stat.keyPassesPer90 ?? 0;
      // 5. Playmaking (Assists/90: scale 0 to 0.5)
      const astP90 = stat.assistsPer90 ?? 0;

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
          rawValue: `${shotsP90.toFixed(2)} shots/90`,
        },
        {
          key: 'shotAccuracy',
          label: 'ON TARGET',
          value: normalizeMetric(sotP90, 0, 2.0),
          rawValue: `${sotP90.toFixed(2)} SoT/90`,
        },
        {
          key: 'creativity',
          label: 'CHANCE CREATION',
          value: normalizeMetric(kpP90, 0, 2.8),
          rawValue: `${kpP90.toFixed(2)} KP/90`,
        },
        {
          key: 'playmaking',
          label: 'PLAYMAKING',
          value: normalizeMetric(astP90, 0, 0.5),
          rawValue: `${astP90.toFixed(2)} ast/90`,
        },
      ];
    }

    case 'MID':
    default: {
      // 1. Passing Volume (Passes/90: scale 0 to 80)
      const passesP90 = stat.passesPer90 ?? 0;
      // 2. Pass Accuracy (scale 65% to 95%)
      const passAcc = stat.passAccuracy ?? 0;
      // 3. Creativity (Key Passes/90: scale 0 to 3.0)
      const kpP90 = stat.keyPassesPer90 ?? 0;
      // 4. Ball Recovery (Tackles + Interceptions/90: scale 0 to 4.5)
      const defContr = (stat.tacklesPer90 ?? 0) + (stat.interceptionsPer90 ?? 0);
      // 5. Goal Threat (Goals + Assists/90: scale 0 to 0.8)
      const goalThreat = (stat.goalsPer90 ?? 0) + (stat.assistsPer90 ?? 0);

      return [
        {
          key: 'passingVolume',
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
          value: normalizeMetric(kpP90, 0, 3.0),
          rawValue: `${kpP90.toFixed(2)} KP/90`,
        },
        {
          key: 'ballRecovery',
          label: 'RECOVERY',
          value: normalizeMetric(defContr, 0, 4.5),
          rawValue: `${defContr.toFixed(2)} act/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 0.8),
          rawValue: `${goalThreat.toFixed(2)} G+A/90`,
        },
      ];
    }
  }
}
