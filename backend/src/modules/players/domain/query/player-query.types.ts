/**
 * ScoutBoard — Player Advanced Query Domain Types
 *
 * Defines the recursive Boolean query tree used by QUERY /players.
 * These types are the client-facing contract AND the domain model.
 *
 * Tree structure:
 *   QueryNode = FieldCondition | GroupNode
 *   GroupNode  = { kind:'GROUP', operator:AND|OR, conditions: QueryNode[] }
 *   FieldCondition = { kind:'CONDITION', field, operator, value }
 *
 * OR is always represented as an explicit GroupNode(operator:'OR').
 * There is no implicit row-level precedence — grouping is always explicit.
 */

export type BooleanOperator = 'AND' | 'OR';

export type ConditionOperator =
  'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NOT_IN' | 'BETWEEN';

export type ConditionValue =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | boolean[]
  | [number, number];

/**
 * A leaf condition node in the query tree.
 *
 * `field` must be a registered metric key from PLAYER_METRIC_REGISTRY.
 * The backend never accepts raw SQL column names or expressions from the client.
 *
 * `value` interpretation depends on the operator:
 *   - EQ / NE / GT / GTE / LT / LTE → scalar number or string
 *   - IN / NOT_IN                    → non-empty array of scalars
 *   - BETWEEN                        → [min, max] tuple (min <= max)
 */
export interface FieldCondition {
  readonly kind: 'CONDITION';
  readonly field: string;
  readonly operator: ConditionOperator;
  readonly value: ConditionValue;
}

/**
 * A group node in the query tree.
 *
 * Groups combine their children with a boolean operator (AND or OR).
 * Groups can contain other groups — nesting is unlimited.
 * `conditions` must be non-empty (validated before SQL generation).
 */
export interface GroupNode {
  readonly kind: 'GROUP';
  readonly operator: BooleanOperator;
  readonly conditions: QueryNode[];
}

export type MatchAggregationType = 'COUNT' | 'AVG' | 'QUALIFYING_RATE';

export type CohortBaselineType = 'AVERAGE' | 'MEDIAN';
export type CohortComparisonType = CohortBaselineType | 'PERCENTILE' | 'RANK';

export interface CohortDefinition {
  readonly competitionId?: string;
  readonly seasonId?: string;
  readonly position?: string[];
  /** When true, cohort distribution is evaluated dynamically over the candidate context of the query. */
  readonly context?: boolean;
}

export interface CohortComparisonCondition {
  readonly kind: 'COHORT_COMPARISON';
  readonly metric: string;
  readonly comparison: {
    readonly type: CohortComparisonType;
    readonly operator: Exclude<ConditionOperator, 'IN' | 'NOT_IN' | 'BETWEEN'>;
    readonly value?: number;
  };
  readonly cohort: CohortDefinition;
}

/**
 * A player-level predicate calculated from the player's persisted match rows.
 * COUNT and QUALIFYING_RATE aggregate rows satisfying matchCriteria. AVG uses
 * `field` over played rows satisfying matchCriteria (minutes_played > 0).
 */
export interface MatchAggregationCondition {
  readonly kind: 'MATCH_AGGREGATION';
  readonly matchCriteria: FieldCondition;
  readonly aggregation: {
    readonly type: MatchAggregationType;
    readonly operator: Exclude<ConditionOperator, 'IN' | 'NOT_IN' | 'BETWEEN'>;
    readonly value: number;
    /** Required by AVG; must be a registered MATCH_STAT metric. */
    readonly field?: string;
  };
}

/**
 * A QueryNode is either a leaf FieldCondition or a nested GroupNode.
 * The `kind` discriminant enables exhaustive type-safe traversal.
 */
export type QueryNode =
  | FieldCondition
  | GroupNode
  | MatchAggregationCondition
  | CohortComparisonCondition;

/**
 * Optional scope for the advanced query — restricts season statistics
 * to a specific competition and/or season context.
 * When omitted, the query runs across all available season statistics.
 */
export interface PlayerAdvancedQueryScope {
  readonly competitionId?: string;
  readonly seasonId?: string;
}

/**
 * The complete input for QueryPlayersUseCase.
 */
export interface PlayerAdvancedQueryInput {
  readonly queryNode: unknown; // validated by PlayerQueryValidator before use
  readonly pagination?: {
    readonly limit?: number;
    readonly offset?: number;
  };
  readonly scope?: PlayerAdvancedQueryScope;
}
