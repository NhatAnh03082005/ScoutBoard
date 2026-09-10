/**
 * ScoutBoard — Player Metric Registry
 *
 * Single source of truth for all queryable player metrics.
 *
 * Architecture:
 *   - Each metric is a self-describing `PlayerMetricDefinition`.
 *   - Registry is a Map<key, definition> → O(1) lookup, no if/else chains.
 *   - MetricSourceType is extensible: Task 1 uses PLAYER + SEASON_STAT;
 *     future tasks may add MATCH_STAT and COHORT without redesigning this contract.
 *   - Operator allowlists are per-metric and per-data-type.
 *   - Position applicability is declared as metadata (not enforced in Task 1 queries
 *     but available for future position-aware validation).
 */

import { CANONICAL_PLAYER_POSITIONS } from '../enums/player-position.enum';
import type { ConditionOperator } from './player-query.types';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/**
 * Data type taxonomy for metric values.
 * Controls which operators are valid and what value type to expect.
 */
export type MetricDataType = 'NUMBER' | 'ENUM' | 'STRING';

/**
 * Extensible source taxonomy.
 *
 * Task 1 implements: PLAYER, SEASON_STAT
 * Future tasks may add: MATCH_STAT (Task 2), COHORT (Task 3)
 * Adding a new source type does NOT require redesigning this type or the registry.
 */
export type MetricSourceType =
  'PLAYER' | 'SEASON_STAT' | 'MATCH_STAT' | 'COHORT';

/**
 * How the metric value is produced from the database.
 *
 * RAW        — maps directly to a stored column (e.g. pss.goals)
 * NORMALIZED — stored column that was computed/pre-aggregated (e.g. pss.goals_per90)
 * DERIVED    — computed on-the-fly via a SQL expression (e.g. pass_accuracy via CASE/NULLIF)
 */
export type MetricKind = 'RAW' | 'NORMALIZED' | 'DERIVED';

/**
 * Full self-describing definition of a queryable player metric.
 * Every field is readonly — definitions are immutable registry entries.
 */
export interface PlayerMetricDefinition {
  /** Canonical key sent by the client and used to look up this metric. */
  readonly key: string;

  /** Human-readable label for UI and documentation. */
  readonly label: string;

  /** Value data type — determines valid operators and expected value shape. */
  readonly dataType: MetricDataType;

  /** Database source this metric is read from. */
  readonly sourceType: MetricSourceType;

  /** How this metric value is produced. */
  readonly kind: MetricKind;

  /** Complete set of operators valid for this metric. */
  readonly allowedOperators: ReadonlyArray<ConditionOperator>;

  /**
   * For ENUM metrics: the complete set of valid values.
   * Validator will reject values not in this set for EQ/NE.
   */
  readonly enumValues?: ReadonlyArray<string>;

  /**
   * Optional: positions for which this metric is meaningful.
   * undefined = applicable to all positions.
   * ['GK'] = goalkeeper-only metric.
   * Not enforced as a hard query error in Task 1 but available for UI hints.
   */
  readonly applicablePositions?: ReadonlyArray<string>;

  /** Whether this metric supports sorting (informational for future use). */
  readonly sortable: boolean;
}

// ---------------------------------------------------------------------------
// Operator Sets (reusable constants)
// ---------------------------------------------------------------------------

const NUMBER_OPS: ReadonlyArray<ConditionOperator> = [
  'GT',
  'GTE',
  'LT',
  'LTE',
  'EQ',
  'NE',
  'BETWEEN',
];

const ENUM_OPS: ReadonlyArray<ConditionOperator> = ['EQ', 'NE', 'IN', 'NOT_IN'];

const STRING_OPS: ReadonlyArray<ConditionOperator> = [
  'EQ',
  'NE',
  'IN',
  'NOT_IN',
];

const POSITION_ENUM_VALUES: ReadonlyArray<string> = CANONICAL_PLAYER_POSITIONS;

// ---------------------------------------------------------------------------
// Registry Entries
// ---------------------------------------------------------------------------

const METRIC_DEFINITIONS: PlayerMetricDefinition[] = [
  // ── Player Profile ────────────────────────────────────────────────────────
  {
    key: 'age',
    label: 'Age',
    dataType: 'NUMBER',
    sourceType: 'PLAYER',
    kind: 'DERIVED', // computed: EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'height_cm',
    label: 'Height (cm)',
    dataType: 'NUMBER',
    sourceType: 'PLAYER',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'weight_kg',
    label: 'Weight (kg)',
    dataType: 'NUMBER',
    sourceType: 'PLAYER',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'position',
    label: 'Position',
    dataType: 'ENUM',
    sourceType: 'PLAYER',
    kind: 'NORMALIZED',
    allowedOperators: ENUM_OPS,
    enumValues: POSITION_ENUM_VALUES,
    sortable: false,
  },
  {
    key: 'nationality',
    label: 'Nationality',
    dataType: 'STRING',
    sourceType: 'PLAYER',
    kind: 'RAW',
    allowedOperators: STRING_OPS,
    sortable: false,
  },

  // ── Season Stats — Volume ─────────────────────────────────────────────────
  {
    key: 'minutes',
    label: 'Minutes Played',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'appearances',
    label: 'Appearances',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'starts',
    label: 'Starts',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },

  // ── Season Stats — Attack ─────────────────────────────────────────────────
  {
    key: 'goals',
    label: 'Goals',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'assists',
    label: 'Assists',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'shots',
    label: 'Shots',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'shots_on_target',
    label: 'Shots on Target',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },

  // ── Season Stats — Passing ────────────────────────────────────────────────
  {
    key: 'key_passes',
    label: 'Key Passes',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'passes_attempted',
    label: 'Passes Attempted',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'passes_completed',
    label: 'Passes Completed',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'pass_accuracy',
    label: 'Pass Accuracy (%)',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'DERIVED', // computed: passes_completed * 100.0 / NULLIF(passes_attempted, 0)
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },

  // ── Season Stats — Defense ────────────────────────────────────────────────
  {
    key: 'tackles',
    label: 'Tackles',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'interceptions',
    label: 'Interceptions',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'duels_won',
    label: 'Duels Won',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'yellow_cards',
    label: 'Yellow Cards',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'red_cards',
    label: 'Red Cards',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },

  // ── Per-90 (Pre-computed / Normalized) ───────────────────────────────────
  {
    key: 'goals_per90',
    label: 'Goals / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'assists_per90',
    label: 'Assists / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'key_passes_per90',
    label: 'Key Passes / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'tackles_per90',
    label: 'Tackles / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: 'interceptions_per90',
    label: 'Interceptions / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    sortable: true,
  },

  // ── Goalkeeper Specific ───────────────────────────────────────────────────
  {
    key: 'saves',
    label: 'Saves',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
  {
    key: 'goals_conceded',
    label: 'Goals Conceded',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
  {
    key: 'clean_sheets',
    label: 'Clean Sheets',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'RAW',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
  {
    key: 'saves_per90',
    label: 'Saves / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
  {
    key: 'goals_conceded_per90',
    label: 'Goals Conceded / 90',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
  {
    key: 'save_percentage',
    label: 'Save Percentage (%)',
    dataType: 'NUMBER',
    sourceType: 'SEASON_STAT',
    kind: 'NORMALIZED',
    allowedOperators: NUMBER_OPS,
    applicablePositions: ['GK'],
    sortable: true,
  },
];

// ---------------------------------------------------------------------------
// Registry Map — O(1) lookup, no if/else chains required by consumers
// ---------------------------------------------------------------------------

const REGISTRY: ReadonlyMap<string, PlayerMetricDefinition> = new Map(
  METRIC_DEFINITIONS.map((def) => [def.key, def]),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the metric definition for a given key, or undefined if not registered.
 */
export function getMetric(key: string): PlayerMetricDefinition | undefined {
  return REGISTRY.get(key);
}

/**
 * Returns the metric definition for a given key.
 * Throws a descriptive error if the key is not in the registry.
 * Use this when the key should always exist (e.g. in the builder after validation).
 */
export function requireMetric(key: string): PlayerMetricDefinition {
  const def = REGISTRY.get(key);
  if (!def) {
    throw new Error(
      `Metric "${key}" is not registered in the player metric registry.`,
    );
  }
  return def;
}

/**
 * Returns true if the given operator is valid for the given metric key.
 * Returns false if the metric does not exist.
 */
export function isValidOperatorForMetric(
  key: string,
  op: ConditionOperator,
): boolean {
  const def = REGISTRY.get(key);
  if (!def) return false;
  return (def.allowedOperators as ConditionOperator[]).includes(op);
}

/**
 * Returns all registered metric definitions as an array.
 */
export function getAllMetrics(): PlayerMetricDefinition[] {
  return Array.from(REGISTRY.values());
}

/**
 * Returns all metric definitions for a given source type.
 * Useful for grouping metrics in UIs or for source-specific validation.
 */
export function getMetricsBySource(
  source: MetricSourceType,
): PlayerMetricDefinition[] {
  return Array.from(REGISTRY.values()).filter(
    (def) => def.sourceType === source,
  );
}

/**
 * Returns true if the given key is a registered metric.
 */
export function isRegisteredMetric(key: string): boolean {
  return REGISTRY.has(key);
}
