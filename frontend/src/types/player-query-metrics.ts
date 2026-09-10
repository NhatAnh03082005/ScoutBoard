/**
 * ScoutBoard — Player Query Metric Definitions (Frontend)
 *
 * Single source of truth for queryable metrics in the Advanced Query Builder UI.
 * Mirrors the backend PLAYER_METRIC_REGISTRY — must be kept in sync if metrics change.
 *
 * Grouped by category for rendering in the field dropdown.
 */

import { CANONICAL_PLAYER_POSITIONS } from './player.types';
import type { QueryMetricDefinition, ConditionOperator } from './player.types';

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
