import type {
  GroupNode,
  QueryNode,
  PlayerPosition,
  PlayerQueryScope,
} from '../../../types/player.types';
import { buildRangeCondition } from '../../../types/player-query-metrics';

// ---------------------------------------------------------------------------
// Statistic Range & Top N Types
// ---------------------------------------------------------------------------

export interface StatisticRangeRow {
  id: string;
  metricKey: string;
  from: string;
  to: string;
  error?: string;
}

export interface TopNConfig {
  enabled: boolean;
  preset: number | 'custom';
  customValue: string;
  metricKey: string;
}

export const TOP_N_PRESETS: readonly (number | 'custom')[] = [
  1, 5, 10, 15, 20, 25, 50, 'custom',
] as const;

// ---------------------------------------------------------------------------
// Canonical Position Grouping (15 Canonical Positions - No DEF/MID/FWD)
// ---------------------------------------------------------------------------

export interface PositionDef {
  code: PlayerPosition;
  label: string;
  desc: string;
}

export interface PositionGroup {
  name: string;
  badgeClass: string;
  positions: PositionDef[];
}

export const TACTICAL_POSITION_GROUPS: PositionGroup[] = [
  {
    name: 'Goalkeepers',
    badgeClass: 'scout-pos-cat-gk',
    positions: [{ code: 'GK', label: 'GK', desc: 'Goalkeeper' }],
  },
  {
    name: 'Defenders',
    badgeClass: 'scout-pos-cat-def',
    positions: [
      { code: 'LB', label: 'LB', desc: 'Left Fullback' },
      { code: 'CB', label: 'CB', desc: 'Center Back' },
      { code: 'RB', label: 'RB', desc: 'Right Fullback' },
      { code: 'LWB', label: 'LWB', desc: 'Left Wing Back' },
      { code: 'RWB', label: 'RWB', desc: 'Right Wing Back' },
    ],
  },
  {
    name: 'Midfielders',
    badgeClass: 'scout-pos-cat-mid',
    positions: [
      { code: 'CDM', label: 'CDM', desc: 'Defensive Midfielder' },
      { code: 'CM', label: 'CM', desc: 'Central Midfielder' },
      { code: 'CAM', label: 'CAM', desc: 'Attacking Midfielder' },
      { code: 'LM', label: 'LM', desc: 'Left Midfielder' },
      { code: 'RM', label: 'RM', desc: 'Right Midfielder' },
    ],
  },
  {
    name: 'Attackers',
    badgeClass: 'scout-pos-cat-att',
    positions: [
      { code: 'LW', label: 'LW', desc: 'Left Winger' },
      { code: 'CF', label: 'CF', desc: 'Center Forward' },
      { code: 'ST', label: 'ST', desc: 'Striker' },
      { code: 'RW', label: 'RW', desc: 'Right Winger' },
    ],
  },
];

/**
 * Validate range row inputs (from, to)
 */
export const validateRangeRow = (from: string, to: string): string | undefined => {
  const trimmedFrom = from.trim();
  const trimmedTo = to.trim();

  let fromNum: number | undefined;
  if (trimmedFrom !== '') {
    fromNum = Number(trimmedFrom);
    if (isNaN(fromNum)) return 'Please enter a valid number.';
    if (fromNum < 0) return 'Value cannot be negative.';
  }

  let toNum: number | undefined;
  if (trimmedTo !== '') {
    toNum = Number(trimmedTo);
    if (isNaN(toNum)) return 'Please enter a valid number.';
    if (toNum < 0) return 'Value cannot be negative.';
  }

  if (fromNum !== undefined && toNum !== undefined && fromNum > toNum) {
    return 'Minimum value cannot be greater than maximum value.';
  }

  return undefined;
};

/**
 * Pure helper to compose QueryNode tree from context parameters
 */
export const buildSearchQueryNode = (
  selectedCompetitionIds: string[],
  selectedClubIds: string[],
  selectedPosition: PlayerPosition | null,
  statisticRows: StatisticRangeRow[],
  topNConfig: TopNConfig,
  topNValue?: number,
): GroupNode => {
  const rootConditions: QueryNode[] = [];

  // 1. Competition condition or OR-group
  if (selectedCompetitionIds.length === 1) {
    rootConditions.push({
      kind: 'CONDITION',
      field: 'competition',
      operator: 'EQ',
      value: selectedCompetitionIds[0],
    });
  } else if (selectedCompetitionIds.length > 1) {
    rootConditions.push({
      kind: 'GROUP',
      operator: 'OR',
      conditions: selectedCompetitionIds.map((id) => ({
        kind: 'CONDITION',
        field: 'competition',
        operator: 'EQ',
        value: id,
      })),
    });
  }

  // 2. Club condition or OR-group
  if (selectedClubIds.length === 1) {
    rootConditions.push({
      kind: 'CONDITION',
      field: 'club',
      operator: 'EQ',
      value: selectedClubIds[0],
    });
  } else if (selectedClubIds.length > 1) {
    rootConditions.push({
      kind: 'GROUP',
      operator: 'OR',
      conditions: selectedClubIds.map((id) => ({
        kind: 'CONDITION',
        field: 'club',
        operator: 'EQ',
        value: id,
      })),
    });
  }

  // 3. Position condition
  if (selectedPosition) {
    rootConditions.push({
      kind: 'CONDITION',
      field: 'position',
      operator: 'EQ',
      value: selectedPosition,
    });
  }

  // 4. Statistic range conditions
  for (const row of statisticRows) {
    const fromVal = row.from.trim() === '' ? null : Number(row.from.trim());
    const toVal = row.to.trim() === '' ? null : Number(row.to.trim());
    const rangeCond = buildRangeCondition(row.metricKey, fromVal, toVal);
    if (rangeCond) {
      rootConditions.push(rangeCond);
    }
  }

  // 5. Top N Ranking condition
  if (topNConfig.enabled && topNValue && topNConfig.metricKey) {
    rootConditions.push({
      kind: 'COHORT_COMPARISON',
      metric: topNConfig.metricKey,
      comparison: {
        type: 'RANK',
        operator: 'LTE',
        value: topNValue,
      },
      cohort: {
        context: true,
      },
    });
  }

  // Fallback if no criteria selected
  if (rootConditions.length === 0) {
    rootConditions.push({
      kind: 'CONDITION',
      field: 'appearances',
      operator: 'GTE',
      value: 0,
    });
  }

  return {
    kind: 'GROUP',
    operator: 'AND',
    conditions: rootConditions,
  };
};

/**
 * Retain single competitionId scope if exactly 1 is chosen
 */
export const buildSearchScope = (
  selectedCompetitionIds: string[],
): PlayerQueryScope | undefined => {
  if (selectedCompetitionIds.length === 1) {
    return { competitionId: selectedCompetitionIds[0] };
  }
  return undefined;
};
