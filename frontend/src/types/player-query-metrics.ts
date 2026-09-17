/**
 * ScoutBoard — Player Query Metric Definitions (Frontend)
 *
 * Single source of truth for queryable metrics in the Advanced Query Builder UI.
 * Mirrors the backend PLAYER_METRIC_REGISTRY — must be kept in sync if metrics change.
 *
 * Grouped by category for rendering in the field dropdown.
 */

import { CANONICAL_PLAYER_POSITIONS } from './player.types';
import type {
  QueryMetricDefinition,
  ConditionOperator,
  PlayerPosition,
  QueryNode,
  FieldCondition,
  MatchAggregationCondition,
  CohortComparisonCondition,
} from './player.types';

const NUMBER_OPS: ConditionOperator[] = ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NE', 'BETWEEN'];
const ENUM_OPS: ConditionOperator[] = ['EQ', 'NE', 'IN', 'NOT_IN'];
const STRING_OPS: ConditionOperator[] = ['EQ', 'NE', 'IN', 'NOT_IN'];

export type MetricCategory =
  | 'Profile'
  | 'Volume'
  | 'Attack'
  | 'Passing'
  | 'Defense'
  | 'Per 90'
  | 'Goalkeeper';

export interface CategorizedMetric extends QueryMetricDefinition {
  category: MetricCategory;
}

export const PLAYER_QUERY_METRICS: CategorizedMetric[] = [
  // ── Player Profile ────────────────────────────────────────────────────────
  {
    key: 'age',
    label: 'Age',
    category: 'Profile',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'height_cm',
    label: 'Height (cm)',
    category: 'Profile',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'weight_kg',
    label: 'Weight (kg)',
    category: 'Profile',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'position',
    label: 'Position',
    category: 'Profile',
    dataType: 'ENUM',
    allowedOperators: ENUM_OPS,
    enumValues: [...CANONICAL_PLAYER_POSITIONS],
  },
  {
    key: 'nationality',
    label: 'Nationality',
    category: 'Profile',
    dataType: 'STRING',
    allowedOperators: STRING_OPS,
  },
  {
    key: 'club',
    label: 'Club',
    category: 'Profile',
    dataType: 'STRING',
    allowedOperators: STRING_OPS,
  },
  {
    key: 'competition',
    label: 'Competition',
    category: 'Profile',
    dataType: 'STRING',
    allowedOperators: STRING_OPS,
  },

  // ── Volume ────────────────────────────────────────────────────────────────
  {
    key: 'minutes',
    label: 'Minutes Played',
    category: 'Volume',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'appearances',
    label: 'Appearances',
    category: 'Volume',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'starts',
    label: 'Starts',
    category: 'Volume',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },

  // ── Attack ────────────────────────────────────────────────────────────────
  {
    key: 'goals',
    label: 'Goals',
    category: 'Attack',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'assists',
    label: 'Assists',
    category: 'Attack',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'shots',
    label: 'Shots',
    category: 'Attack',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'shots_on_target',
    label: 'Shots on Target',
    category: 'Attack',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },

  // ── Passing ───────────────────────────────────────────────────────────────
  {
    key: 'key_passes',
    label: 'Key Passes',
    category: 'Passing',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'passes_attempted',
    label: 'Passes Attempted',
    category: 'Passing',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'passes_completed',
    label: 'Passes Completed',
    category: 'Passing',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'pass_accuracy',
    label: 'Pass Accuracy (%)',
    category: 'Passing',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },

  // ── Defense ───────────────────────────────────────────────────────────────
  {
    key: 'tackles',
    label: 'Tackles',
    category: 'Defense',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'interceptions',
    label: 'Interceptions',
    category: 'Defense',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'duels_won',
    label: 'Duels Won',
    category: 'Defense',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'yellow_cards',
    label: 'Yellow Cards',
    category: 'Defense',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'red_cards',
    label: 'Red Cards',
    category: 'Defense',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },

  // ── Per 90 ────────────────────────────────────────────────────────────────
  {
    key: 'goals_per90',
    label: 'Goals / 90',
    category: 'Per 90',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'assists_per90',
    label: 'Assists / 90',
    category: 'Per 90',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'key_passes_per90',
    label: 'Key Passes / 90',
    category: 'Per 90',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'tackles_per90',
    label: 'Tackles / 90',
    category: 'Per 90',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },
  {
    key: 'interceptions_per90',
    label: 'Interceptions / 90',
    category: 'Per 90',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
  },

  // ── Goalkeeper ────────────────────────────────────────────────────────────
  {
    key: 'saves',
    label: 'Saves',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
  {
    key: 'goals_conceded',
    label: 'Goals Conceded',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
  {
    key: 'clean_sheets',
    label: 'Clean Sheets',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
  {
    key: 'saves_per90',
    label: 'Saves / 90',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
  {
    key: 'goals_conceded_per90',
    label: 'Goals Conceded / 90',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
  {
    key: 'save_percentage',
    label: 'Save Percentage (%)',
    category: 'Goalkeeper',
    dataType: 'NUMBER',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
  },
];

/** Grouped by category for rendering in a grouped <select> or UI sections. */
export const PLAYER_QUERY_METRICS_BY_CATEGORY: Map<MetricCategory, CategorizedMetric[]> =
  PLAYER_QUERY_METRICS.reduce((acc, metric) => {
    const group = acc.get(metric.category) ?? [];
    group.push(metric);
    acc.set(metric.category, group);
    return acc;
  }, new Map<MetricCategory, CategorizedMetric[]>());

/** O(1) lookup by key. */
export const PLAYER_QUERY_METRICS_MAP: Map<string, CategorizedMetric> = new Map(
  PLAYER_QUERY_METRICS.map((m) => [m.key, m]),
);

export function getMetricByKey(key: string): CategorizedMetric | undefined {
  return PLAYER_QUERY_METRICS_MAP.get(key);
}

/** Persisted player_match_statistics fields available to Task 2 aggregations.
 *
 * Mirrors MATCH_METRIC_DEFINITIONS in the backend player-metric.registry.ts.
 * `match_is_starter` is declared as BOOLEAN (not ENUM) — the backend validator
 * expects an actual boolean value (true/false), not strings.
 */
export const PLAYER_MATCH_QUERY_METRICS: QueryMetricDefinition[] = [
  { key: 'match_rating', label: 'Match Rating', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_minutes_played', label: 'Match Minutes Played', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_is_starter', label: 'Is Starter', dataType: 'BOOLEAN', allowedOperators: ['EQ', 'NE'] },
  { key: 'match_goals', label: 'Match Goals', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_assists', label: 'Match Assists', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_shots', label: 'Match Shots', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_key_passes', label: 'Match Key Passes', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_passes_attempted', label: 'Match Passes Attempted', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_passes_completed', label: 'Match Passes Completed', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_tackles', label: 'Match Tackles', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_interceptions', label: 'Match Interceptions', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_yellow_cards', label: 'Match Yellow Cards', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_red_cards', label: 'Match Red Cards', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_saves', label: 'Match Saves (GK)', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_goals_conceded', label: 'Match Goals Conceded (GK)', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_clean_sheets', label: 'Match Clean Sheets (GK)', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
  { key: 'match_penalties_saved', label: 'Match Penalties Saved (GK)', dataType: 'NUMBER', allowedOperators: [...NUMBER_OPS] },
];

/**
 * Shared serializer to strip internal tracking properties (like __id) before API dispatch.
 * Pure function reusable across any UI builder implementation.
 */
export function stripQueryNodeIds(node: QueryNode): QueryNode {
  if (node.kind === 'CONDITION') {
    const { __id, ...rest } = node as any;
    void __id;
    return rest as FieldCondition;
  }
  if (node.kind === 'MATCH_AGGREGATION') {
    const { __id, ...rest } = node as any;
    void __id;
    return rest as MatchAggregationCondition;
  }
  if (node.kind === 'COHORT_COMPARISON') {
    const { __id, ...rest } = node as any;
    void __id;
    return rest as CohortComparisonCondition;
  }
  return {
    kind: 'GROUP',
    operator: node.operator,
    conditions: node.conditions.map(stripQueryNodeIds),
  };
}

/**
 * Shared range operator converter:
 * Converts From / To numeric inputs into a clean FieldCondition.
 * - Both from & to defined: BETWEEN [from, to] (or EQ if from === to)
 * - Only from defined: GTE from
 * - Only to defined: LTE to
 * - Neither defined: null
 */
export function buildRangeCondition(
  field: string,
  from?: number | null,
  to?: number | null,
): FieldCondition | null {
  const hasFrom = from !== undefined && from !== null && !isNaN(from);
  const hasTo = to !== undefined && to !== null && !isNaN(to);

  if (hasFrom && hasTo) {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    if (min === max) {
      return { kind: 'CONDITION', field, operator: 'EQ', value: min };
    }
    return { kind: 'CONDITION', field, operator: 'BETWEEN', value: [min, max] };
  }
  if (hasFrom) {
    return { kind: 'CONDITION', field, operator: 'GTE', value: from };
  }
  if (hasTo) {
    return { kind: 'CONDITION', field, operator: 'LTE', value: to };
  }
  return null;
}

/**
 * Canonical position -> relevant performance metric keys.
 * Excludes non-performance Profile metrics (age, height, weight, nationality, position).
 * Preserves the fixed 15 canonical positions (GK, LB, CB, RB, LWB, RWB, CM, CDM, CAM, LM, RM, LW, RW, CF, ST).
 */
export const POSITION_PERFORMANCE_METRIC_KEYS: Record<
  PlayerPosition,
  readonly string[]
> = {
  GK: [
    'saves',
    'goals_conceded',
    'clean_sheets',
    'saves_per90',
    'goals_conceded_per90',
    'save_percentage',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  CB: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'goals',
    'goals_per90',
    'yellow_cards',
    'red_cards',
    'minutes',
    'appearances',
    'starts',
  ],
  LB: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'yellow_cards',
    'red_cards',
    'minutes',
    'appearances',
    'starts',
  ],
  RB: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'yellow_cards',
    'red_cards',
    'minutes',
    'appearances',
    'starts',
  ],
  LWB: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  RWB: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  CDM: [
    'tackles',
    'interceptions',
    'duels_won',
    'tackles_per90',
    'interceptions_per90',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'key_passes',
    'key_passes_per90',
    'yellow_cards',
    'red_cards',
    'minutes',
    'appearances',
    'starts',
  ],
  CM: [
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'tackles',
    'interceptions',
    'tackles_per90',
    'interceptions_per90',
    'goals',
    'goals_per90',
    'minutes',
    'appearances',
    'starts',
  ],
  CAM: [
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'passes_attempted',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  LM: [
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'tackles',
    'interceptions',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  RM: [
    'key_passes',
    'key_passes_per90',
    'assists',
    'assists_per90',
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'tackles',
    'interceptions',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  LW: [
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'assists',
    'assists_per90',
    'key_passes',
    'key_passes_per90',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  RW: [
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'assists',
    'assists_per90',
    'key_passes',
    'key_passes_per90',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  CF: [
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'assists',
    'assists_per90',
    'key_passes',
    'key_passes_per90',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
  ST: [
    'goals',
    'goals_per90',
    'shots',
    'shots_on_target',
    'assists',
    'assists_per90',
    'key_passes',
    'key_passes_per90',
    'passes_completed',
    'pass_accuracy',
    'minutes',
    'appearances',
    'starts',
  ],
};

/**
 * Returns the list of performance metrics tailored for the given canonical position.
 */
export function getPositionPerformanceMetrics(
  position: PlayerPosition,
): CategorizedMetric[] {
  const keys = POSITION_PERFORMANCE_METRIC_KEYS[position] ?? [];
  return keys
    .map((k) => PLAYER_QUERY_METRICS_MAP.get(k))
    .filter((m): m is CategorizedMetric => m !== undefined);
}
