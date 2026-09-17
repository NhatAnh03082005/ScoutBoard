import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
  ComparisonScopeType,
} from '../../../types/player.types';

export interface AggregatedStats {
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  goalConversion: number | null;

  // Derived Outfield Per-90 Metrics
  goalsPer90: number | null;
  assistsPer90: number | null;
  shotsPer90: number | null;
  goalThreatPer90: number | null;
  passesPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;
  recoveriesPer90: number | null;

  // Goalkeeper Specific Metrics
  saves: number;
  goalsConceded: number;
  cleanSheets: number;
  penaltiesSaved: number;
  savesPer90: number | null;
  goalsConcededPer90: number | null;
  savePercentage: number | null;
  cleanSheetPercentage: number | null;
}

export interface MetricConfig {
  label: string;
  getValue: (stats: AggregatedStats | null) => number | null | undefined;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

export interface ThemeStyles {
  border: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  winnerBg: string;
  winnerColor: string;
  winnerBorder?: string;
}

export interface MetricSection {
  title: string;
  icon: string;
  theme: ThemeStyles;
  metrics: MetricConfig[];
}

export const OUTFIELD_METRIC_SECTIONS: MetricSection[] = [
  {
    title: 'PLAYING TIME',
    icon: '⏱',
    theme: {
      border: '2px solid #cbd5e1',
      headerBorder: '1px solid #cbd5e1',
      badgeBg: '#1e293b',
      badgeText: '#ffffff',
      winnerBg: '#f1f5f9',
      winnerColor: '#ffffff',
      winnerBorder: 'none',
    },
    metrics: [
      { label: 'MATCHES', getValue: (s) => s?.appearances, higherIsBetter: true },
      { label: 'STARTS', getValue: (s) => s?.starts, higherIsBetter: true },
      { label: 'MINUTES PLAYED', getValue: (s) => s?.minutesPlayed, higherIsBetter: true },
    ],
  },
  {
    title: 'ATTACKING OUTPUT',
    icon: '⚡',
    theme: {
      border: '2px solid #fecdd3',
      headerBorder: '1px solid #fecdd3',
      badgeBg: '#e11d48',
      badgeText: '#ffffff',
      winnerBg: '#fff1f2',
      winnerColor: '#be123c',
      winnerBorder: '1px solid #ffe4e6',
    },
    metrics: [
      { label: 'GOALS', getValue: (s) => s?.goals, higherIsBetter: true },
      { label: 'ASSISTS', getValue: (s) => s?.assists, higherIsBetter: true },
      { label: 'SHOTS', getValue: (s) => s?.shots, higherIsBetter: true },
      { label: 'GOAL CONVERSION %', getValue: (s) => s?.goalConversion, isPercentage: true, higherIsBetter: true },
      { label: 'GOALS / 90', getValue: (s) => s?.goalsPer90, higherIsBetter: true },
      { label: 'ASSISTS / 90', getValue: (s) => s?.assistsPer90, higherIsBetter: true },
      { label: 'SHOTS / 90', getValue: (s) => s?.shotsPer90, higherIsBetter: true },
      { label: 'GOAL THREAT / 90', getValue: (s) => s?.goalThreatPer90, higherIsBetter: true },
    ],
  },
  {
    title: 'PASSING & CREATIVITY',
    icon: '🎯',
    theme: {
      border: '2px solid #bfdbfe',
      headerBorder: '1px solid #bfdbfe',
      badgeBg: '#2563eb',
      badgeText: '#ffffff',
      winnerBg: '#eff6ff',
      winnerColor: '#1d4ed8',
      winnerBorder: '1px solid #dbeafe',
    },
    metrics: [
      { label: 'PASSES ATTEMPTED', getValue: (s) => s?.passesAttempted, higherIsBetter: true },
      { label: 'PASSES COMPLETED', getValue: (s) => s?.passesCompleted, higherIsBetter: true },
      { label: 'PASS ACCURACY', getValue: (s) => s?.passAccuracy, isPercentage: true, higherIsBetter: true },
      { label: 'KEY PASSES', getValue: (s) => s?.keyPasses, higherIsBetter: true },
      { label: 'PASSES / 90', getValue: (s) => s?.passesPer90, higherIsBetter: true },
      { label: 'KEY PASSES / 90', getValue: (s) => s?.keyPassesPer90, higherIsBetter: true },
    ],
  },
  {
    title: 'DEFENDING',
    icon: '🛡️',
    theme: {
      border: '2px solid #a7f3d0',
      headerBorder: '1px solid #a7f3d0',
      badgeBg: '#059669',
      badgeText: '#ffffff',
      winnerBg: '#ecfdf5',
      winnerColor: '#047857',
      winnerBorder: '1px solid #d1fae5',
    },
    metrics: [
      { label: 'TACKLES', getValue: (s) => s?.tackles, higherIsBetter: true },
      { label: 'INTERCEPTIONS', getValue: (s) => s?.interceptions, higherIsBetter: true },
      { label: 'BALL RECOVERIES', getValue: (s) => s?.recoveries, higherIsBetter: true },
      { label: 'TACKLES / 90', getValue: (s) => s?.tacklesPer90, higherIsBetter: true },
      { label: 'INTERCEPTIONS / 90', getValue: (s) => s?.interceptionsPer90, higherIsBetter: true },
      { label: 'BALL RECOVERY / 90', getValue: (s) => s?.recoveriesPer90, higherIsBetter: true },
    ],
  },
];

export const GOALKEEPER_METRIC_SECTIONS: MetricSection[] = [
  {
    title: 'PLAYING TIME',
    icon: '⏱',
    theme: {
      border: '2px solid #cbd5e1',
      headerBorder: '1px solid #cbd5e1',
      badgeBg: '#1e293b',
      badgeText: '#ffffff',
      winnerBg: '#f1f5f9',
      winnerColor: '#ffffff',
      winnerBorder: 'none',
    },
    metrics: [
      { label: 'MATCHES', getValue: (s) => s?.appearances, higherIsBetter: true },
      { label: 'STARTS', getValue: (s) => s?.starts, higherIsBetter: true },
      { label: 'MINUTES PLAYED', getValue: (s) => s?.minutesPlayed, higherIsBetter: true },
    ],
  },
  {
    title: 'GOALKEEPING & SHOT STOPPING',
    icon: '🧤',
    theme: {
      border: '2px solid #fde68a',
      headerBorder: '1px solid #fde68a',
      badgeBg: '#d97706',
      badgeText: '#ffffff',
      winnerBg: '#fffbeb',
      winnerColor: '#92400e',
      winnerBorder: '1px solid #fef3c7',
    },
    metrics: [
      { label: 'SAVES', getValue: (s) => s?.saves, higherIsBetter: true },
      { label: 'GOALS CONCEDED', getValue: (s) => s?.goalsConceded, higherIsBetter: false },
      { label: 'CLEAN SHEETS', getValue: (s) => s?.cleanSheets, higherIsBetter: true },
      { label: 'PENALTIES SAVED', getValue: (s) => s?.penaltiesSaved, higherIsBetter: true },
      { label: 'SAVES / 90', getValue: (s) => s?.savesPer90, higherIsBetter: true },
      { label: 'GOALS CONCEDED / 90', getValue: (s) => s?.goalsConcededPer90, higherIsBetter: false },
      { label: 'SAVE %', getValue: (s) => s?.savePercentage, isPercentage: true, higherIsBetter: true },
      { label: 'CLEAN SHEET %', getValue: (s) => s?.cleanSheetPercentage, isPercentage: true, higherIsBetter: true },
    ],
  },
  {
    title: 'DISTRIBUTION',
    icon: '⚽',
    theme: {
      border: '2px solid #bfdbfe',
      headerBorder: '1px solid #bfdbfe',
      badgeBg: '#2563eb',
      badgeText: '#ffffff',
      winnerBg: '#eff6ff',
      winnerColor: '#1d4ed8',
      winnerBorder: '1px solid #dbeafe',
    },
    metrics: [
      { label: 'PASSES ATTEMPTED', getValue: (s) => s?.passesAttempted, higherIsBetter: true },
      { label: 'PASSES COMPLETED', getValue: (s) => s?.passesCompleted, higherIsBetter: true },
      { label: 'PASS ACCURACY', getValue: (s) => s?.passAccuracy, isPercentage: true, higherIsBetter: true },
      { label: 'PASSES / 90', getValue: (s) => s?.passesPer90, higherIsBetter: true },
    ],
  },
];

export const calculateAge = (dateOfBirth?: string | null): string => {
  if (!dateOfBirth) return '—';
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} YRS`;
};

export const formatNumber = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number.isInteger(val) ? String(val) : val.toFixed(decimals);
};

export const getPlayerPositionCodes = (player: PlayerDetail | null): string[] => {
  if (!player) return [];
  const codes = new Set<string>();
  if (player.primaryPosition) {
    codes.add(player.primaryPosition.trim().toUpperCase());
  }
  if (player.positions && Array.isArray(player.positions)) {
    player.positions.forEach((p) => {
      if (p.positionCode) {
        codes.add(p.positionCode.trim().toUpperCase());
      }
    });
  }
  return Array.from(codes);
};

export const extractAggregatedStats = (
  records: PlayerSeasonStatisticItem[],
  scope: ComparisonScopeType,
  seasonId: string,
  competitionId: string | undefined,
  statsA: PlayerSeasonStatisticItem[],
  statsB: PlayerSeasonStatisticItem[],
): AggregatedStats | null => {
  if (!records || records.length === 0) return null;

  let targetRecords: PlayerSeasonStatisticItem[] = [];

  if (scope === 'COMPETITION' && competitionId) {
    targetRecords = records.filter(
      (r) => r.season?.id === seasonId && r.competition?.id === competitionId,
    );
  } else {
    const targetSeasonRecord =
      statsA.find((s) => s.season?.id === seasonId) ||
      statsB.find((s) => s.season?.id === seasonId);
    const targetSeasonCode = targetSeasonRecord?.season?.seasonCode;

    targetRecords = records.filter(
      (r) =>
        r.season?.id === seasonId ||
        (targetSeasonCode && r.season?.seasonCode === targetSeasonCode),
    );
  }

  if (targetRecords.length === 0) return null;

  // Sum raw metrics
  let appearances = 0;
  let starts = 0;
  let minutesPlayed = 0;
  let goals = 0;
  let assists = 0;
  let shots = 0;
  let passesAttempted = 0;
  let passesCompleted = 0;
  let keyPasses = 0;
  let tackles = 0;
  let interceptions = 0;

  // Goalkeeper raw metrics
  let saves = 0;
  let goalsConceded = 0;
  let cleanSheets = 0;
  let penaltiesSaved = 0;

  targetRecords.forEach((r) => {
    appearances += r.appearances || 0;
    starts += r.starts || 0;
    minutesPlayed += r.minutesPlayed || 0;
    goals += r.goals || 0;
    assists += r.assists || 0;
    shots += r.shots || 0;
    passesAttempted += r.passesAttempted || 0;
    passesCompleted += r.passesCompleted || 0;
    keyPasses += r.keyPasses || 0;
    tackles += r.tackles || 0;
    interceptions += r.interceptions || 0;

    if (r.saves !== null && r.saves !== undefined) {
      saves += r.saves;
    }
    if (r.goalsConceded !== null && r.goalsConceded !== undefined) {
      goalsConceded += r.goalsConceded;
    }
    if (r.cleanSheets !== null && r.cleanSheets !== undefined) {
      cleanSheets += r.cleanSheets;
    }
    if (r.penaltiesSaved !== null && r.penaltiesSaved !== undefined) {
      penaltiesSaved += r.penaltiesSaved;
    }
  });

  // Derived pass accuracy
  const passAccuracy =
    passesAttempted > 0
      ? Number(((passesCompleted / passesAttempted) * 100).toFixed(2))
      : null;

  // Derived goal conversion
  const goalConversion =
    shots > 0 ? Number(((goals / shots) * 100).toFixed(2)) : null;

  const recoveries = tackles + interceptions;

  // Derived per 90 metrics (guarded against division by zero)
  const calcPer90 = (val: number | null | undefined): number | null => {
    if (val === null || val === undefined || minutesPlayed <= 0) return null;
    return Number(((val * 90) / minutesPlayed).toFixed(2));
  };

  // Goalkeeper rates
  const totalShotsFaced = saves + goalsConceded;
  const savePercentage =
    totalShotsFaced > 0
      ? Number(((saves / totalShotsFaced) * 100).toFixed(2))
      : null;

  const cleanSheetPercentage =
    appearances > 0
      ? Number(((cleanSheets / appearances) * 100).toFixed(2))
      : null;

  return {
    appearances,
    starts,
    minutesPlayed,
    goals,
    assists,
    shots,
    passesAttempted,
    passesCompleted,
    passAccuracy,
    keyPasses,
    tackles,
    interceptions,
    recoveries,
    goalConversion,
    goalsPer90: calcPer90(goals),
    assistsPer90: calcPer90(assists),
    shotsPer90: calcPer90(shots),
    goalThreatPer90: calcPer90(goals + assists),
    passesPer90: calcPer90(passesAttempted),
    keyPassesPer90: calcPer90(keyPasses),
    tacklesPer90: calcPer90(tackles),
    interceptionsPer90: calcPer90(interceptions),
    recoveriesPer90: calcPer90(recoveries),

    // Goalkeeper metrics
    saves,
    goalsConceded,
    cleanSheets,
    penaltiesSaved,
    savesPer90: calcPer90(saves),
    goalsConcededPer90: calcPer90(goalsConceded),
    savePercentage,
    cleanSheetPercentage,
  };
};
