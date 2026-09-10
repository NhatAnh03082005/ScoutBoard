/**
 * ScoutBoard — Player Query Builder
 *
 * Translates a validated QueryNode tree into TypeORM SelectQueryBuilder clauses.
 * This is the ONLY layer that knows SQL expressions — the domain layer has zero SQL knowledge.
 *
 * Key design principles:
 *  1. METRIC_SQL_MAP is a lookup table, not a chain of if/else.
 *  2. `expression` strings are backend-controlled literals — never derived from user input.
 *  3. The user-supplied `field` value is used only to look up a pre-defined entry.
 *     The validator rejects unknown fields before this layer is reached.
 *  4. All values are bound as named TypeORM parameters (:p0, :p1, …).
 *     No string concatenation of user values ever occurs.
 *  5. The `pss` (player_season_statistics) join is added at most once,
 *     only when at least one condition requires it.
 */

import { Brackets, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import { requireMetric } from 'src/modules/players/domain/query/player-metric.registry';
import type {
  QueryNode,
  FieldCondition,
  GroupNode,
  ConditionOperator,
} from 'src/modules/players/domain/query/player-query.types';

// ---------------------------------------------------------------------------
// SQL Expression Map
// ---------------------------------------------------------------------------

/**
 * Describes how a metric maps to a SQL expression.
 *
 * `expression` uses TypeORM entity alias references (e.g. `player.heightCm`),
 * except for raw PostgreSQL functions where the column name must be used explicitly.
 *
 * `requiresStatJoin` = true  → a JOIN on player_season_statistics (alias: pss) is needed.
 * `requiresStatJoin` = false → the expression only references the `player` alias.
 */
interface MetricSqlExpression {
  readonly expression: string;
  readonly requiresStatJoin: boolean;
}

/**
 * The single registry of metric → SQL mappings.
 * Adding a new metric requires only one new entry here (and in the domain registry).
 * No conditional logic in the builder itself.
 */
const METRIC_SQL_MAP: Readonly<Record<string, MetricSqlExpression>> = {
  // ── Player profile (PLAYER source) ────────────────────────────────────────
  age: {
    expression: `EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth))`,
    requiresStatJoin: false,
  },
  height_cm: {
    expression: `player.heightCm`,
    requiresStatJoin: false,
  },
  weight_kg: {
    expression: `player.weightKg`,
    requiresStatJoin: false,
  },
  position: {
    expression: `player.primaryPosition`,
    requiresStatJoin: false,
  },
  nationality: {
    expression: `player.nationality`,
    requiresStatJoin: false,
  },

  // ── Season stats — volume (SEASON_STAT source, RAW) ───────────────────────
  minutes: {
    expression: `pss.minutes_played`,
    requiresStatJoin: true,
  },
  appearances: {
    expression: `pss.matches_played`,
    requiresStatJoin: true,
  },
  starts: {
    expression: `pss.starts`,
    requiresStatJoin: true,
  },

  // ── Season stats — attack ─────────────────────────────────────────────────
  goals: {
    expression: `pss.goals`,
    requiresStatJoin: true,
  },
  assists: {
    expression: `pss.assists`,
    requiresStatJoin: true,
  },
  shots: {
    expression: `pss.shots`,
    requiresStatJoin: true,
  },
  shots_on_target: {
    expression: `pss.shots_on_target`,
    requiresStatJoin: true,
  },

  // ── Season stats — passing ────────────────────────────────────────────────
  key_passes: {
    expression: `pss.key_passes`,
    requiresStatJoin: true,
  },
  passes_attempted: {
    expression: `pss.passes_attempted`,
    requiresStatJoin: true,
  },
  passes_completed: {
    expression: `pss.passes_completed`,
    requiresStatJoin: true,
  },
  pass_accuracy: {
    // DERIVED: safe NULLIF to avoid division-by-zero; null when no pass attempts
    expression:
      `CASE WHEN NULLIF(pss.passes_attempted, 0) IS NOT NULL ` +
      `THEN ROUND(CAST(pss.passes_completed * 100.0 / NULLIF(pss.passes_attempted, 0) AS DECIMAL), 2) ` +
      `END`,
    requiresStatJoin: true,
  },

  // ── Season stats — defense ────────────────────────────────────────────────
  tackles: {
    expression: `pss.tackles`,
    requiresStatJoin: true,
  },
  interceptions: {
    expression: `pss.interceptions`,
    requiresStatJoin: true,
  },
  duels_won: {
    expression: `pss.duels_won`,
    requiresStatJoin: true,
  },
  yellow_cards: {
    expression: `pss.yellow_cards`,
    requiresStatJoin: true,
  },
  red_cards: {
    expression: `pss.red_cards`,
    requiresStatJoin: true,
  },

  // ── Per-90 normalized (pre-computed columns) ──────────────────────────────
  goals_per90: {
    expression: `pss.goals_per_90`,
    requiresStatJoin: true,
  },
  assists_per90: {
    expression: `pss.assists_per_90`,
    requiresStatJoin: true,
  },
  key_passes_per90: {
    expression: `pss.key_passes_per_90`,
    requiresStatJoin: true,
  },
  tackles_per90: {
    expression: `pss.tackles_per_90`,
    requiresStatJoin: true,
  },
  interceptions_per90: {
    expression: `pss.interceptions_per_90`,
    requiresStatJoin: true,
  },

  // ── Goalkeeper specific ───────────────────────────────────────────────────
  saves: {
    expression: `pss.saves`,
    requiresStatJoin: true,
  },
  goals_conceded: {
    expression: `pss.goals_conceded`,
    requiresStatJoin: true,
  },
  clean_sheets: {
    expression: `pss.clean_sheets`,
    requiresStatJoin: true,
  },
  saves_per90: {
    expression: `pss.saves_per_90`,
    requiresStatJoin: true,
  },
  goals_conceded_per90: {
    expression: `pss.goals_conceded_per_90`,
    requiresStatJoin: true,
  },
  save_percentage: {
    expression: `pss.save_percentage`,
    requiresStatJoin: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Build Context
// ---------------------------------------------------------------------------

/**
 * Mutable build context passed through recursive tree traversal.
 * Tracks parameter counter for unique parameter names and whether the
 * pss join has already been added.
 */
export interface BuildContext {
  paramCounter: number;
  statJoinAdded: boolean;
}

export function createBuildContext(): BuildContext {
  return { paramCounter: 0, statJoinAdded: false };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Walks the validated QueryNode tree and applies WHERE clauses to the given
 * TypeORM SelectQueryBuilder. Adds the pss JOIN if any condition requires it.
 *
 * The caller is responsible for building the base query (player + currentTeam +
 * positions joins). This function only adds WHERE conditions and the pss join.
 *
 * @param rootNode  - A validated QueryNode (root is typically a GroupNode).
 * @param qb        - The TypeORM SelectQueryBuilder to append to.
 * @param context   - Build context (shared across recursive calls).
 */
export function buildWhereClause(
  rootNode: QueryNode,
  qb: SelectQueryBuilder<any>,
  context: BuildContext,
): void {
  // First pass: determine if any condition requires the stat join
  if (!context.statJoinAdded && treeRequiresStatJoin(rootNode)) {
    qb.innerJoin(
      'player_season_statistics',
      'pss',
      'pss.player_id = player.id',
    );
    context.statJoinAdded = true;
  }

  // Apply the root node as an AND WHERE (the root bracket wraps everything)
  qb.andWhere(buildBrackets(rootNode, context));
}

// ---------------------------------------------------------------------------
// Tree traversal — stat join pre-check
// ---------------------------------------------------------------------------

function treeRequiresStatJoin(node: QueryNode): boolean {
  if (node.kind === 'CONDITION') {
    const mapping = METRIC_SQL_MAP[node.field];
    return mapping?.requiresStatJoin ?? false;
  }
  // GROUP: check children recursively
  return node.conditions.some(treeRequiresStatJoin);
}

// ---------------------------------------------------------------------------
// Recursive WHERE clause builder
// ---------------------------------------------------------------------------

function buildBrackets(node: QueryNode, context: BuildContext): Brackets {
  return new Brackets((qb) => {
    if (node.kind === 'GROUP') {
      buildGroupNode(node, qb, context);
    } else {
      buildConditionNode(node, qb, context);
    }
  });
}

function buildGroupNode(
  group: GroupNode,
  qb: WhereExpressionBuilder,
  context: BuildContext,
): void {
  for (let i = 0; i < group.conditions.length; i++) {
    const child = group.conditions[i];
    const childBrackets = buildBrackets(child, context);

    if (group.operator === 'AND') {
      if (i === 0) {
        qb.where(childBrackets);
      } else {
        qb.andWhere(childBrackets);
      }
    } else {
      // OR
      if (i === 0) {
        qb.where(childBrackets);
      } else {
        qb.orWhere(childBrackets);
      }
    }
  }
}

function buildConditionNode(
  condition: FieldCondition,
  qb: WhereExpressionBuilder,
  context: BuildContext,
): void {
  // requireMetric is safe here: validator already confirmed the field exists
  requireMetric(condition.field);

  const mapping = METRIC_SQL_MAP[condition.field];
  if (!mapping) {
    // Should never reach here after validation, but guard defensively
    throw new Error(`No SQL mapping found for metric: ${condition.field}`);
  }

  const expr = mapping.expression;
  const op = condition.operator;
  const value = condition.value;

  const paramName = `p${context.paramCounter++}`;
  const clause = buildOperatorClause(expr, op, value, paramName, context);

  qb.where(clause.sql, clause.params);
}

// ---------------------------------------------------------------------------
// Operator → SQL clause
// ---------------------------------------------------------------------------

interface SqlClause {
  sql: string;
  params: Record<string, unknown>;
}

function buildOperatorClause(
  expr: string,
  op: ConditionOperator,
  value: unknown,
  paramName: string,
  context: BuildContext,
): SqlClause {
  switch (op) {
    case 'EQ':
      return { sql: `${expr} = :${paramName}`, params: { [paramName]: value } };

    case 'NE':
      return {
        sql: `${expr} != :${paramName}`,
        params: { [paramName]: value },
      };

    case 'GT':
      return { sql: `${expr} > :${paramName}`, params: { [paramName]: value } };

    case 'GTE':
      return {
        sql: `${expr} >= :${paramName}`,
        params: { [paramName]: value },
      };

    case 'LT':
      return { sql: `${expr} < :${paramName}`, params: { [paramName]: value } };

    case 'LTE':
      return {
        sql: `${expr} <= :${paramName}`,
        params: { [paramName]: value },
      };

    case 'IN': {
      const paramNameArr = `${paramName}Arr`;
      return {
        sql: `${expr} IN (:...${paramNameArr})`,
        params: { [paramNameArr]: value },
      };
    }

    case 'NOT_IN': {
      const paramNameArr = `${paramName}Arr`;
      return {
        sql: `${expr} NOT IN (:...${paramNameArr})`,
        params: { [paramNameArr]: value },
      };
    }

    case 'BETWEEN': {
      const arr = value as [number, number];
      const paramA = `p${context.paramCounter++}`;
      const paramB = `p${context.paramCounter++}`;
      return {
        sql: `${expr} BETWEEN :${paramA} AND :${paramB}`,
        params: { [paramA]: arr[0], [paramB]: arr[1] },
      };
    }

    default: {
      const exhaustiveCheck: never = op;
      throw new Error(`Unsupported operator: ${exhaustiveCheck}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Export for testing
// ---------------------------------------------------------------------------

export { METRIC_SQL_MAP };
