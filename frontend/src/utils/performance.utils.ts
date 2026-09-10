export type PerformanceCardGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface PerformanceCardMetricItem {
  label: string;
  value: string; // Formatted main value for display (e.g. "76.5%", "2.15", "—")
  subtext: string; // Context subtitle (e.g. "12 saves / 15 shots faced", "14 completed / 18 attempted")
}

export interface PerformanceCardConfig {
  title: string;
  icon: string;
  colorClass: 'card-blue' | 'card-amber' | 'card-emerald';
  titleClass: 'title-blue' | 'title-amber' | 'title-emerald';
  gridClass: 'scout-clean-grid-2' | 'scout-clean-grid-3';
  metrics: PerformanceCardMetricItem[];
}

/**
 * Maps any position code into one of the 4 Performance Card groups.
 * GK -> GK
 * CB, LB, RB, LWB, RWB, DEF -> DEF
 * CDM, CM, CAM, LM, RM, MID -> MID
 * ST, CF, LW, RW, FWD, ATT -> ATT
 */
export function getPerformanceCardGroup(posCode?: string | null): PerformanceCardGroup {
  if (!posCode) return 'MID';
  const upper = posCode.trim().toUpperCase();

  if (upper === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(upper)) return 'DEF';
  if (['CDM', 'DM', 'CM', 'CAM', 'AM', 'LM', 'RM', 'MID'].includes(upper)) return 'MID';
  if (['ST', 'CF', 'LW', 'RW', 'FWD', 'ATT', 'FORWARD'].includes(upper)) return 'ATT';

  return 'MID';
}

function formatPer90(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  return num.toFixed(2);
}

function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(1)}%`;
}

/**
 * Returns the exact 3 Performance Cards for any player and group,
 * strictly omitting unreliable fields (duels_won, shots_on_target, penalties_faced).
 */
export function getPerformanceCardsData(
  stat: any | null | undefined,
  group: PerformanceCardGroup,
): PerformanceCardConfig[] {
  if (!stat) {
    return [];
  }

  const minutesPlayed = stat.minutesPlayed ?? 0;
  const passesAttempted = stat.passesAttempted ?? 0;
  const passesCompleted = stat.passesCompleted ?? 0;
  const keyPasses = stat.keyPasses ?? 0;
  const tackles = stat.tackles ?? 0;
  const interceptions = stat.interceptions ?? 0;
  const goals = stat.goals ?? 0;
  const assists = stat.assists ?? 0;
  const shots = stat.shots ?? 0;

  // Pass Accuracy calculation
  const passAccuracyNum: number | null =
    stat.passAccuracy !== null && stat.passAccuracy !== undefined
      ? (typeof stat.passAccuracy === 'string' ? parseFloat(stat.passAccuracy) : stat.passAccuracy)
      : passesAttempted > 0
      ? (passesCompleted / passesAttempted) * 100
      : null;
  const passAccuracyDisplay = passAccuracyNum !== null ? formatPct(passAccuracyNum) : '—';
  const passAccuracySub = passesAttempted > 0 ? `${passesCompleted} completed / ${passesAttempted} attempted` : '—';

  // Ball Recovery per 90: ((tackles + interceptions) * 90) / minutes
  const ballRecoveryPer90 =
    minutesPlayed > 0
      ? (((tackles + interceptions) * 90) / minutesPlayed).toFixed(2)
      : '—';
  const ballRecoverySub = `${tackles + interceptions} tackles & interceptions`;

  // Goal Threat per 90: ((goals + assists) * 90) / minutes
  const goalThreatPer90 =
    minutesPlayed > 0
      ? (((goals + assists) * 90) / minutesPlayed).toFixed(2)
      : '—';
  const goalThreatSub = `${goals + assists} goals & assists`;

  switch (group) {
    // =========================================================================
    // 1. GOALKEEPER (GK)
    // =========================================================================
    case 'GK': {
      const rawSaves = stat.saves ?? 0;
      const rawGoalsConceded = stat.goalsConceded ?? 0;
      const shotsFaced = rawSaves + rawGoalsConceded;
      const rawCleanSheets = stat.cleanSheets ?? 0;
      const rawAppearances = stat.appearances ?? stat.matchesPlayed ?? 0;

      // Save %
      let savePctDisplay = '—';
      if (shotsFaced > 0 && stat.saves !== null && stat.saves !== undefined) {
        savePctDisplay = `${((rawSaves / shotsFaced) * 100).toFixed(1)}%`;
      } else if (stat.savePercentage !== null && stat.savePercentage !== undefined) {
        savePctDisplay = `${Number(stat.savePercentage).toFixed(1)}%`;
      }

      // Clean Sheet %
      let cleanSheetPctDisplay = '—';
      if (rawAppearances > 0 && stat.cleanSheets !== null && stat.cleanSheets !== undefined) {
        cleanSheetPctDisplay = `${((rawCleanSheets / rawAppearances) * 100).toFixed(1)}%`;
      } else if (stat.cleanSheetPercentage !== null && stat.cleanSheetPercentage !== undefined) {
        cleanSheetPctDisplay = `${Number(stat.cleanSheetPercentage).toFixed(1)}%`;
      }

      return [
        {
          title: 'GOALKEEPING EFFICIENCY',
          icon: '🧤',
          colorClass: 'card-blue',
          titleClass: 'title-blue',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'SAVE %',
              value: savePctDisplay,
              subtext: shotsFaced > 0 ? `${rawSaves} saves / ${shotsFaced} shots faced` : '—',
            },
            {
              label: 'CLEAN SHEET %',
              value: cleanSheetPctDisplay,
              subtext: rawAppearances > 0 ? `${rawCleanSheets} clean sheets / ${rawAppearances} appearances` : '—',
            },
          ],
        },
        {
          title: 'SHOT STOPPING',
          icon: '🛡️',
          colorClass: 'card-amber',
          titleClass: 'title-amber',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'SAVES / 90',
              value: formatPer90(stat.savesPer90),
              subtext: `${rawSaves} total saves`,
            },
            {
              label: 'GOALS CONCEDED / 90',
              value: formatPer90(stat.goalsConcededPer90),
              subtext: `${rawGoalsConceded} total goals conceded`,
            },
          ],
        },
        {
          title: 'DISTRIBUTION',
          icon: '🎯',
          colorClass: 'card-emerald',
          titleClass: 'title-emerald',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'PASS ACCURACY',
              value: passAccuracyDisplay,
              subtext: passAccuracySub,
            },
            {
              label: 'PASSES / 90',
              value: formatPer90(stat.passesPer90),
              subtext: `${passesAttempted} attempted`,
            },
          ],
        },
      ];
    }

    // =========================================================================
    // 2. DEFENDER (DEF)
    // =========================================================================
    case 'DEF': {
      return [
        {
          title: 'DEFENSIVE EFFICIENCY',
          icon: '🛡️',
          colorClass: 'card-emerald',
          titleClass: 'title-emerald',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'PASS ACCURACY',
              value: passAccuracyDisplay,
              subtext: passAccuracySub,
            },
            {
              label: 'BALL RECOVERY / 90',
              value: ballRecoveryPer90,
              subtext: ballRecoverySub,
            },
          ],
        },
        {
          title: 'DEFENSIVE OUTPUT',
          icon: '⚔️',
          colorClass: 'card-blue',
          titleClass: 'title-blue',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'TACKLES / 90',
              value: formatPer90(stat.tacklesPer90),
              subtext: `${tackles} total tackles`,
            },
            {
              label: 'INTERCEPTIONS / 90',
              value: formatPer90(stat.interceptionsPer90),
              subtext: `${interceptions} total interceptions`,
            },
          ],
        },
        {
          title: 'BUILD-UP / DISTRIBUTION',
          icon: '🎯',
          colorClass: 'card-amber',
          titleClass: 'title-amber',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'PASSES / 90',
              value: formatPer90(stat.passesPer90),
              subtext: `${passesAttempted} attempted`,
            },
            {
              label: 'KEY PASSES / 90',
              value: formatPer90(stat.keyPassesPer90),
              subtext: `${keyPasses} key passes`,
            },
          ],
        },
      ];
    }

    // =========================================================================
    // 3. MIDFIELDER (MID)
    // =========================================================================
    case 'MID': {
      return [
        {
          title: 'PASSING EFFICIENCY',
          icon: '🎯',
          colorClass: 'card-blue',
          titleClass: 'title-blue',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'PASS ACCURACY',
              value: passAccuracyDisplay,
              subtext: passAccuracySub,
            },
            {
              label: 'BALL RECOVERY / 90',
              value: ballRecoveryPer90,
              subtext: ballRecoverySub,
            },
          ],
        },
        {
          title: 'MIDFIELD OUTPUT',
          icon: '⚙️',
          colorClass: 'card-amber',
          titleClass: 'title-amber',
          gridClass: 'scout-clean-grid-3',
          metrics: [
            {
              label: 'PASSES / 90',
              value: formatPer90(stat.passesPer90),
              subtext: `${passesAttempted} total attempted`,
            },
            {
              label: 'KEY PASSES / 90',
              value: formatPer90(stat.keyPassesPer90),
              subtext: `${keyPasses} key passes`,
            },
            {
              label: 'TACKLES / 90',
              value: formatPer90(stat.tacklesPer90),
              subtext: `${tackles} tackles`,
            },
          ],
        },
        {
          title: 'MIDFIELD IMPACT',
          icon: '🛡️',
          colorClass: 'card-emerald',
          titleClass: 'title-emerald',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'GOAL THREAT / 90',
              value: goalThreatPer90,
              subtext: goalThreatSub,
            },
            {
              label: 'INTERCEPTIONS / 90',
              value: formatPer90(stat.interceptionsPer90),
              subtext: `${interceptions} interceptions`,
            },
          ],
        },
      ];
    }

    // =========================================================================
    // 4. FORWARD (ATT)
    // =========================================================================
    case 'ATT':
    default: {
      const goalConversionDisplay = shots > 0 ? `${((goals / shots) * 100).toFixed(1)}%` : '—';
      const goalConversionSub = shots > 0 ? `${goals} goals / ${shots} shots` : '—';

      return [
        {
          title: 'ATTACKING EFFICIENCY',
          icon: '🎯',
          colorClass: 'card-amber',
          titleClass: 'title-amber',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'GOAL CONVERSION %',
              value: goalConversionDisplay,
              subtext: goalConversionSub,
            },
            {
              label: 'PASS ACCURACY',
              value: passAccuracyDisplay,
              subtext: passAccuracySub,
            },
          ],
        },
        {
          title: 'ATTACKING OUTPUT',
          icon: '⚽',
          colorClass: 'card-blue',
          titleClass: 'title-blue',
          gridClass: 'scout-clean-grid-3',
          metrics: [
            {
              label: 'GOALS / 90',
              value: formatPer90(stat.goalsPer90),
              subtext: `${goals} total goals`,
            },
            {
              label: 'ASSISTS / 90',
              value: formatPer90(stat.assistsPer90),
              subtext: `${assists} total assists`,
            },
            {
              label: 'SHOTS / 90',
              value: formatPer90(stat.shotsPer90),
              subtext: `${shots} total shots`,
            },
          ],
        },
        {
          title: 'CHANCE CREATION',
          icon: '⚡',
          colorClass: 'card-emerald',
          titleClass: 'title-emerald',
          gridClass: 'scout-clean-grid-2',
          metrics: [
            {
              label: 'KEY PASSES / 90',
              value: formatPer90(stat.keyPassesPer90),
              subtext: `${keyPasses} key passes`,
            },
            {
              label: 'GOAL THREAT / 90',
              value: goalThreatPer90,
              subtext: goalThreatSub,
            },
          ],
        },
      ];
    }
  }
}
