import type { PlayerSeasonStatisticItem } from '../types/player.types';

export type TacticalRadarProfile =
  | 'GK'
  | 'CB'
  | 'FULLBACK'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'WIDE'
  | 'ATT';

// Alias for backwards compatibility if needed
export type RadarProfile = TacticalRadarProfile;

export interface RadarMetric {
  key: string;
  label: string; // English all-caps label
  value: number; // 0 to 100 normalized score
  rawValue: string; // Human-readable formatted string for tooltip/display
}

export interface AxisDefinition {
  key: string;
  label: string;
  sourceMetric: string;
  min: number;
  max: number;
  inverse?: boolean;
  calculate: (stat: any, derived: DerivedContext) => { numValue: number; rawValue: string };
}

export interface DerivedContext {
  minutes: number;
  passAcc: number;
  passesP90: number;
  keyPassesP90: number;
  tacklesP90: number;
  intP90: number;
  goalsP90: number;
  assistsP90: number;
  shotsP90: number;
  ballRecoveryP90: number;
  goalThreatP90: number;
  goalConversionPct: number | null;
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
 * Maps any position code into one of the 8 Tactical Radar Profiles.
 * GK -> GK
 * CB -> CB
 * LB, RB, LWB, RWB -> FULLBACK
 * CDM -> CDM
 * CM -> CM
 * CAM -> CAM
 * LM, RM -> WIDE
 * LW, RW, CF, ST -> ATT
 */
export function getRadarProfile(posCode?: string | null): TacticalRadarProfile {
  if (!posCode) return 'CM';
  const upper = posCode.trim().toUpperCase();

  if (upper === 'GK') return 'GK';
  if (upper === 'CB') return 'CB';
  if (['LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(upper)) return 'FULLBACK';
  if (['CDM', 'DM'].includes(upper)) return 'CDM';
  if (upper === 'CM') return 'CM';
  if (['CAM', 'AM'].includes(upper)) return 'CAM';
  if (['LM', 'RM'].includes(upper)) return 'WIDE';
  if (['LW', 'RW', 'CF', 'ST', 'FWD', 'ATT', 'FORWARD'].includes(upper)) return 'ATT';

  return 'CM';
}

/**
 * Human-readable display titles for the 8 Tactical Profiles
 */
export function getRadarProfileTitle(profile: TacticalRadarProfile): string {
  switch (profile) {
    case 'GK':
      return 'GOALKEEPER';
    case 'CB':
      return 'CENTRE BACK';
    case 'FULLBACK':
      return 'FULLBACK / WING BACK';
    case 'CDM':
      return 'DEFENSIVE MIDFIELDER';
    case 'CM':
      return 'CENTRAL MIDFIELDER';
    case 'CAM':
      return 'ATTACKING MIDFIELDER';
    case 'WIDE':
      return 'WIDE MIDFIELDER';
    case 'ATT':
      return 'ATTACKER';
  }
}

/**
 * 8 Configuration-Driven Tactical Radar Profiles.
 * Exactly 5 axes per profile.
 * Zero unreliable fields used (no duels_won, shots_on_target, penalties_faced).
 */
export const RADAR_CONFIGS: Record<TacticalRadarProfile, AxisDefinition[]> = {
  // ===========================================================================
  // 1. GOALKEEPER (GK)
  // ===========================================================================
  GK: [
    {
      key: 'shotStopping',
      label: 'SHOT STOPPING',
      sourceMetric: 'savesPer90',
      min: 0,
      max: 5.0,
      calculate: (stat, ctx) => {
        const savesP90 =
          stat.savesPer90 !== null && stat.savesPer90 !== undefined
            ? Number(stat.savesPer90)
            : ctx.minutes > 0 && stat.saves !== null && stat.saves !== undefined
            ? (stat.saves * 90) / ctx.minutes
            : 0;
        return {
          numValue: savesP90,
          rawValue: savesP90 > 0 ? `${savesP90.toFixed(2)}/90` : `${stat.saves ?? 0} saves`,
        };
      },
    },
    {
      key: 'cleanSheets',
      label: 'CLEAN SHEETS',
      sourceMetric: 'cleanSheets',
      min: 0,
      max: 16,
      calculate: (stat) => {
        const cs = stat.cleanSheets ?? 0;
        return { numValue: cs, rawValue: `${cs} CS` };
      },
    },
    {
      key: 'distribution',
      label: 'DISTRIBUTION',
      sourceMetric: 'passAccuracy',
      min: 40,
      max: 90,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'goalPrevention',
      label: 'GOAL PREVENTION',
      sourceMetric: 'goalsConcededPer90',
      min: 0.6,
      max: 2.4,
      inverse: true, // Lower goals conceded is better
      calculate: (stat, ctx) => {
        const gcP90 =
          stat.goalsConcededPer90 !== null && stat.goalsConcededPer90 !== undefined
            ? Number(stat.goalsConcededPer90)
            : ctx.minutes > 0 && stat.goalsConceded !== null && stat.goalsConceded !== undefined
            ? (stat.goalsConceded * 90) / ctx.minutes
            : 1.5;
        return {
          numValue: gcP90,
          rawValue:
            stat.goalsConcededPer90 !== null && stat.goalsConcededPer90 !== undefined
              ? `${Number(stat.goalsConcededPer90).toFixed(2)} GA/90`
              : `${stat.goalsConceded ?? 0} conceded`,
        };
      },
    },
    {
      key: 'passingVolume',
      label: 'PASSING VOLUME',
      sourceMetric: 'passesPer90',
      min: 10,
      max: 45,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 2. CENTRE BACK (CB)
  // ===========================================================================
  CB: [
    {
      key: 'tackles',
      label: 'TACKLING',
      sourceMetric: 'tacklesPer90',
      min: 0,
      max: 3.5,
      calculate: (_, ctx) => ({
        numValue: ctx.tacklesP90,
        rawValue: `${ctx.tacklesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'interceptions',
      label: 'INTERCEPTIONS',
      sourceMetric: 'interceptionsPer90',
      min: 0,
      max: 2.5,
      calculate: (_, ctx) => ({
        numValue: ctx.intP90,
        rawValue: `${ctx.intP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'ballRecovery',
      label: 'BALL RECOVERY',
      sourceMetric: 'ballRecoveryPer90',
      min: 0,
      max: 5.5,
      calculate: (_, ctx) => ({
        numValue: ctx.ballRecoveryP90,
        rawValue: `${ctx.ballRecoveryP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 65,
      max: 95,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'buildUp',
      label: 'BUILD-UP',
      sourceMetric: 'passesPer90',
      min: 0,
      max: 80,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 3. FULLBACK (LB, RB, LWB, RWB)
  // ===========================================================================
  FULLBACK: [
    {
      key: 'tackles',
      label: 'TACKLING',
      sourceMetric: 'tacklesPer90',
      min: 0,
      max: 3.5,
      calculate: (_, ctx) => ({
        numValue: ctx.tacklesP90,
        rawValue: `${ctx.tacklesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'interceptions',
      label: 'INTERCEPTIONS',
      sourceMetric: 'interceptionsPer90',
      min: 0,
      max: 2.5,
      calculate: (_, ctx) => ({
        numValue: ctx.intP90,
        rawValue: `${ctx.intP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 60,
      max: 92,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'passVolume',
      label: 'PASS VOLUME',
      sourceMetric: 'passesPer90',
      min: 0,
      max: 75,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
    {
      key: 'creativity',
      label: 'CREATIVITY',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 2.5,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 4. DEFENSIVE MIDFIELDER (CDM)
  // ===========================================================================
  CDM: [
    {
      key: 'passVolume',
      label: 'PASS VOLUME',
      sourceMetric: 'passesPer90',
      min: 0,
      max: 85,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 70,
      max: 95,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'ballRecovery',
      label: 'BALL RECOVERY',
      sourceMetric: 'ballRecoveryPer90',
      min: 0,
      max: 6.0,
      calculate: (_, ctx) => ({
        numValue: ctx.ballRecoveryP90,
        rawValue: `${ctx.ballRecoveryP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'interceptions',
      label: 'INTERCEPTIONS',
      sourceMetric: 'interceptionsPer90',
      min: 0,
      max: 3.0,
      calculate: (_, ctx) => ({
        numValue: ctx.intP90,
        rawValue: `${ctx.intP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'creativity',
      label: 'CREATIVITY',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 2.5,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 5. CENTRAL MIDFIELDER (CM)
  // ===========================================================================
  CM: [
    {
      key: 'passVolume',
      label: 'PASS VOLUME',
      sourceMetric: 'passesPer90',
      min: 0,
      max: 80,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 65,
      max: 95,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'creativity',
      label: 'CREATIVITY',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 3.0,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'ballRecovery',
      label: 'BALL RECOVERY',
      sourceMetric: 'ballRecoveryPer90',
      min: 0,
      max: 4.5,
      calculate: (_, ctx) => ({
        numValue: ctx.ballRecoveryP90,
        rawValue: `${ctx.ballRecoveryP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'goalThreat',
      label: 'GOAL THREAT',
      sourceMetric: 'goalThreatPer90',
      min: 0,
      max: 0.8,
      calculate: (_, ctx) => ({
        numValue: ctx.goalThreatP90,
        rawValue: `${ctx.goalThreatP90.toFixed(2)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 6. ATTACKING MIDFIELDER (CAM)
  // ===========================================================================
  CAM: [
    {
      key: 'creativity',
      label: 'CREATIVITY',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 3.5,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 65,
      max: 92,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'assists',
      label: 'ASSISTS',
      sourceMetric: 'assistsPer90',
      min: 0,
      max: 0.6,
      calculate: (_, ctx) => ({
        numValue: ctx.assistsP90,
        rawValue: `${ctx.assistsP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'scoring',
      label: 'SCORING',
      sourceMetric: 'goalsPer90',
      min: 0,
      max: 0.7,
      calculate: (_, ctx) => ({
        numValue: ctx.goalsP90,
        rawValue: `${ctx.goalsP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'goalThreat',
      label: 'GOAL THREAT',
      sourceMetric: 'goalThreatPer90',
      min: 0,
      max: 1.0,
      calculate: (_, ctx) => ({
        numValue: ctx.goalThreatP90,
        rawValue: `${ctx.goalThreatP90.toFixed(2)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 7. WIDE MIDFIELDER (LM, RM)
  // ===========================================================================
  WIDE: [
    {
      key: 'passVolume',
      label: 'PASS VOLUME',
      sourceMetric: 'passesPer90',
      min: 0,
      max: 65,
      calculate: (_, ctx) => ({
        numValue: ctx.passesP90,
        rawValue: `${ctx.passesP90.toFixed(1)}/90`,
      }),
    },
    {
      key: 'passAccuracy',
      label: 'PASS ACCURACY',
      sourceMetric: 'passAccuracy',
      min: 65,
      max: 92,
      calculate: (_, ctx) => ({
        numValue: ctx.passAcc,
        rawValue: `${ctx.passAcc.toFixed(1)}%`,
      }),
    },
    {
      key: 'creativity',
      label: 'CREATIVITY',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 2.8,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'scoring',
      label: 'SCORING',
      sourceMetric: 'goalsPer90',
      min: 0,
      max: 0.5,
      calculate: (_, ctx) => ({
        numValue: ctx.goalsP90,
        rawValue: `${ctx.goalsP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'goalThreat',
      label: 'GOAL THREAT',
      sourceMetric: 'goalThreatPer90',
      min: 0,
      max: 0.9,
      calculate: (_, ctx) => ({
        numValue: ctx.goalThreatP90,
        rawValue: `${ctx.goalThreatP90.toFixed(2)}/90`,
      }),
    },
  ],

  // ===========================================================================
  // 8. ATTACKER (LW, RW, CF, ST)
  // ===========================================================================
  ATT: [
    {
      key: 'scoring',
      label: 'SCORING',
      sourceMetric: 'goalsPer90',
      min: 0,
      max: 1.0,
      calculate: (_, ctx) => ({
        numValue: ctx.goalsP90,
        rawValue: `${ctx.goalsP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'shooting',
      label: 'SHOOTING',
      sourceMetric: 'shotsPer90',
      min: 0,
      max: 4.5,
      calculate: (_, ctx) => ({
        numValue: ctx.shotsP90,
        rawValue: `${ctx.shotsP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'goalConversion',
      label: 'GOAL CONVERSION',
      sourceMetric: 'goalConversion',
      min: 0,
      max: 35.0,
      calculate: (stat, ctx) => {
        const shots = stat.shots ?? 0;
        const goals = stat.goals ?? 0;
        if (shots > 0) {
          const pct = (goals / shots) * 100;
          return { numValue: pct, rawValue: `${pct.toFixed(1)}%` };
        }
        if (ctx.goalConversionPct !== null) {
          return { numValue: ctx.goalConversionPct, rawValue: `${ctx.goalConversionPct.toFixed(1)}%` };
        }
        return { numValue: 0, rawValue: '—' };
      },
    },
    {
      key: 'chanceCreation',
      label: 'CHANCE CREATION',
      sourceMetric: 'keyPassesPer90',
      min: 0,
      max: 2.8,
      calculate: (_, ctx) => ({
        numValue: ctx.keyPassesP90,
        rawValue: `${ctx.keyPassesP90.toFixed(2)}/90`,
      }),
    },
    {
      key: 'assists',
      label: 'ASSISTS',
      sourceMetric: 'assistsPer90',
      min: 0,
      max: 0.5,
      calculate: (_, ctx) => ({
        numValue: ctx.assistsP90,
        rawValue: `${ctx.assistsP90.toFixed(2)}/90`,
      }),
    },
  ],
};

function extractDerivedContext(stat: any): DerivedContext {
  const minutes = stat.minutesPlayed ?? 0;
  const passesAttempted = stat.passesAttempted ?? 0;
  const passesCompleted = stat.passesCompleted ?? 0;
  const keyPasses = stat.keyPasses ?? 0;
  const tackles = stat.tackles ?? 0;
  const interceptions = stat.interceptions ?? 0;
  const goals = stat.goals ?? 0;
  const assists = stat.assists ?? 0;
  const shots = stat.shots ?? 0;

  const passAcc =
    stat.passAccuracy !== null && stat.passAccuracy !== undefined
      ? Number(stat.passAccuracy)
      : passesAttempted > 0
      ? (passesCompleted / passesAttempted) * 100
      : 0;

  const passesP90 =
    stat.passesPer90 !== null && stat.passesPer90 !== undefined
      ? Number(stat.passesPer90)
      : minutes > 0
      ? (passesAttempted * 90) / minutes
      : 0;

  const keyPassesP90 =
    stat.keyPassesPer90 !== null && stat.keyPassesPer90 !== undefined
      ? Number(stat.keyPassesPer90)
      : minutes > 0
      ? (keyPasses * 90) / minutes
      : 0;

  const tacklesP90 =
    stat.tacklesPer90 !== null && stat.tacklesPer90 !== undefined
      ? Number(stat.tacklesPer90)
      : minutes > 0
      ? (tackles * 90) / minutes
      : 0;

  const intP90 =
    stat.interceptionsPer90 !== null && stat.interceptionsPer90 !== undefined
      ? Number(stat.interceptionsPer90)
      : minutes > 0
      ? (interceptions * 90) / minutes
      : 0;

  const goalsP90 =
    stat.goalsPer90 !== null && stat.goalsPer90 !== undefined
      ? Number(stat.goalsPer90)
      : minutes > 0
      ? (goals * 90) / minutes
      : 0;

  const assistsP90 =
    stat.assistsPer90 !== null && stat.assistsPer90 !== undefined
      ? Number(stat.assistsPer90)
      : minutes > 0
      ? (assists * 90) / minutes
      : 0;

  const shotsP90 =
    stat.shotsPer90 !== null && stat.shotsPer90 !== undefined
      ? Number(stat.shotsPer90)
      : minutes > 0
      ? (shots * 90) / minutes
      : 0;

  const ballRecoveryP90 = minutes > 0 ? ((tackles + interceptions) * 90) / minutes : 0;
  const goalThreatP90 = minutes > 0 ? ((goals + assists) * 90) / minutes : 0;
  const goalConversionPct = shots > 0 ? (goals / shots) * 100 : null;

  return {
    minutes,
    passAcc,
    passesP90,
    keyPassesP90,
    tacklesP90,
    intP90,
    goalsP90,
    assistsP90,
    shotsP90,
    ballRecoveryP90,
    goalThreatP90,
    goalConversionPct,
  };
}

/**
 * Returns 5 position-aware tactical metrics normalized to 0-100 for the Radar Chart.
 * Configuration-driven, supporting all 8 tactical profiles.
 */
export function getRadarMetrics(
  posCodeOrProfile?: string | null,
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

  // Check if caller passed a known profile name or a position code
  const upper = (posCodeOrProfile || '').trim().toUpperCase();
  const profile: TacticalRadarProfile = (RADAR_CONFIGS as any)[upper]
    ? (upper as TacticalRadarProfile)
    : getRadarProfile(posCodeOrProfile);

  const config = RADAR_CONFIGS[profile] || RADAR_CONFIGS.CM;
  const derived = extractDerivedContext(stat);

  return config.map((axis) => {
    const { numValue, rawValue } = axis.calculate(stat, derived);
    const normalized = normalizeMetric(numValue, axis.min, axis.max, axis.inverse);
    return {
      key: axis.key,
      label: axis.label,
      value: normalized,
      rawValue,
    };
  });
}

/**
 * Unified calculator function: calculateRadarScores(playerStats, radarProfileOrPos)
 * Shared single source of truth between Player Detail Page and Player Comparison Page.
 */
export function calculateRadarScores(
  stat?: PlayerSeasonStatisticItem | any | null,
  profileOrPosCode?: TacticalRadarProfile | string | null,
): RadarMetric[] {
  return getRadarMetrics(profileOrPosCode, stat);
}
