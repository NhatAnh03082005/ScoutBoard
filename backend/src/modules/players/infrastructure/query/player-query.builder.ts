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
 *
 * Task 2 additions:
 *  6. MATCH_METRIC_SQL_MAP maps match-stat metric keys → SQL column expressions
 *     under the alias `pms` (player_match_statistics).
 *  7. buildMatchAggregationNode generates an EXISTS subquery that:
 *     - JOINs player_match_statistics with matches (for scope filtering)
 *     - Applies season/competition scope from BuildContext if present
 *     - Groups by player_id with HAVING for COUNT/AVG/QUALIFYING_RATE
 *  8. AVG semantics: averages the `aggregation.field` over rows satisfying
 *     `matchCriteria` AND `minutes_played > 0` (excludes non-playing rows).
 *  9. QUALIFYING_RATE: COUNT(played matching rows) / COUNT(played rows), threshold is 0–1.
 */

import { Brackets, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import {
  getMetric,
  requireMetric,
} from 'src/modules/players/domain/query/player-metric.registry';
import type {
  QueryNode,
  FieldCondition,
  GroupNode,
  MatchAggregationCondition,
  CohortComparisonCondition,
  ConditionOperator,
} from 'src/modules/players/domain/query/player-query.types';

// ---------------------------------------------------------------------------
// Match Metric SQL Map (Task 2)
// ---------------------------------------------------------------------------

/**
 * Maps match-stat metric keys to their exact PostgreSQL column references
 * under the `pms` alias (player_match_statistics).
 *
 * All expressions are backend-controlled string literals. User input is
 * never concatenated here — only used to look up a pre-defined entry.
 *
 * Column names are verified against PlayerMatchStatisticOrmEntity:
 *   rating, minutes_played, is_starter, goals, assists, shots,
 *   key_passes, passes_attempted, passes_completed, tackles, interceptions,
 *   yellow_cards, red_cards, saves, goals_conceded, clean_sheets, penalties_saved
 */
const MATCH_METRIC_SQL_MAP: Readonly<Record<string, string>> = {
  match_rating: 'pms.rating',
  match_minutes_played: 'pms.minutes_played',
  match_is_starter: 'pms.is_starter',
  match_goals: 'pms.goals',
  match_assists: 'pms.assists',
  match_shots: 'pms.shots',
  match_key_passes: 'pms.key_passes',
  match_passes_attempted: 'pms.passes_attempted',
  match_passes_completed: 'pms.passes_completed',
  match_tackles: 'pms.tackles',
  match_interceptions: 'pms.interceptions',
  match_yellow_cards: 'pms.yellow_cards',
  match_red_cards: 'pms.red_cards',
  match_saves: 'pms.saves',
  match_goals_conceded: 'pms.goals_conceded',
  match_clean_sheets: 'pms.clean_sheets',
  match_penalties_saved: 'pms.penalties_saved',
} as const;

// ---------------------------------------------------------------------------
// SQL Expression Map (Task 1 — season stats + player profile)
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
  club: {
    expression: `player.current_team_id`,
    requiresStatJoin: false,
  },
  competition: {
    expression: `pss.competition_id`,
    requiresStatJoin: true,
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
 *
 * `paramCounter`   — unique counter for named parameters (:p0, :p1, …).
 * `statJoinAdded`  — whether the pss join has been added (added at most once).
 * `scope`          — optional season/competition scope for match aggregation subqueries.
 *                    When present, EXISTS subqueries filter pms rows by match scope.
 *                    This keeps Task 1 season stats and Task 2 match stats in the same scope.
 */
export interface BuildContext {
  paramCounter: number;
  statJoinAdded: boolean;
  scope?: {
    seasonId?: string;
    competitionId?: string;
  };
  rootNode?: QueryNode;
}

export function createBuildContext(scope?: {
  seasonId?: string;
  competitionId?: string;
}): BuildContext {
  return { paramCounter: 0, statJoinAdded: false, scope };
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
  context.rootNode = rootNode;

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
  if (node.kind === 'MATCH_AGGREGATION') {
    // MATCH_AGGREGATION uses its own subquery — no outer pss join needed
    return false;
  }
  if (node.kind === 'COHORT_COMPARISON') {
    if (node.cohort?.context === true) {
      const mapping = METRIC_SQL_MAP[node.metric];
      return mapping?.requiresStatJoin ?? false;
    }
    return false;
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
    } else if (node.kind === 'MATCH_AGGREGATION') {
      buildMatchAggregationNode(node, qb, context);
    } else if (node.kind === 'COHORT_COMPARISON') {
      buildCohortComparisonNode(node, qb, context);
    } else {
      buildConditionNode(node, qb, context);
    }
  });
}

function buildCohortCandidateConditionSql(
  node: QueryNode,
  context: BuildContext,
  params: Record<string, unknown>,
): string | null {
  if (node.kind === 'CONDITION') {
    const mapping = METRIC_SQL_MAP[node.field];
    if (!mapping) return null;
    const expr = mapping.expression
      .replaceAll('pss.', 'cohort_pss.')
      .replaceAll('player.', 'cohort_player.')
      .replaceAll(
        'cohort_player.primaryPosition',
        'cohort_player.primary_position',
      )
      .replaceAll('cohort_player.heightCm', 'cohort_player.height_cm')
      .replaceAll('cohort_player.weightKg', 'cohort_player.weight_kg');

    if (node.operator === 'BETWEEN') {
      const [minVal, maxVal] = node.value as [number, number];
      const p1 = `p${context.paramCounter++}`;
      const p2 = `p${context.paramCounter++}`;
      params[p1] = minVal;
      params[p2] = maxVal;
      return `(${expr} BETWEEN :${p1} AND :${p2})`;
    }

    if (node.operator === 'IN' || node.operator === 'NOT_IN') {
      const p = `p${context.paramCounter++}`;
      params[p] = node.value;
      const op = node.operator === 'IN' ? 'IN' : 'NOT IN';
      return `(${expr} ${op} (:...${p}))`;
    }

    const p = `p${context.paramCounter++}`;
    params[p] = node.value;
    return `(${expr} ${sqlOperator(node.operator)} :${p})`;
  }

  if (node.kind === 'GROUP') {
    const parts: string[] = [];
    for (const child of node.conditions) {
      const childSql = buildCohortCandidateConditionSql(child, context, params);
      if (childSql) {
        parts.push(childSql);
      }
    }
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return `(${parts.join(` ${node.operator} `)})`;
  }

  return null;
}

function buildCohortComparisonNode(
  node: CohortComparisonCondition,
  qb: WhereExpressionBuilder,
  context: BuildContext,
): void {
  const metric = METRIC_SQL_MAP[node.metric];
  if (!metric?.requiresStatJoin) {
    throw new Error(`Cohort metric is not a season statistic: ${node.metric}`);
  }
  const cohortMetric = metric.expression.replaceAll('pss.', 'cohort_pss.');
  const candidateMetric = metric.expression.replaceAll(
    'pss.',
    'candidate_pss.',
  );
  const rankingDirection = getMetric(node.metric)?.rankingDirection ?? 'DESC';

  let cohortValuesSql: string;
  const cohortParams: Record<string, unknown> = {};

  if (node.cohort?.context === true) {
    const candidateParts: string[] = [];
    if (context.rootNode) {
      if (
        context.rootNode.kind === 'GROUP' &&
        context.rootNode.operator === 'AND'
      ) {
        for (const child of context.rootNode.conditions) {
          if (child === node) continue;
          if (
            child.kind === 'COHORT_COMPARISON' &&
            child.cohort?.context === true
          )
            continue;
          const part = buildCohortCandidateConditionSql(
            child,
            context,
            cohortParams,
          );
          if (part) candidateParts.push(part);
        }
      } else if (context.rootNode !== node) {
        const part = buildCohortCandidateConditionSql(
          context.rootNode,
          context,
          cohortParams,
        );
        if (part) candidateParts.push(part);
      }
    }

    if (context.scope?.seasonId) {
      const p = `p${context.paramCounter++}`;
      candidateParts.push(`cohort_pss.season_id = :${p}`);
      cohortParams[p] = context.scope.seasonId;
    }
    if (context.scope?.competitionId) {
      const p = `p${context.paramCounter++}`;
      candidateParts.push(`cohort_pss.competition_id = :${p}`);
      cohortParams[p] = context.scope.competitionId;
    }

    candidateParts.push(`${cohortMetric} IS NOT NULL`);
    const whereClause = candidateParts.join(' AND ');

    cohortValuesSql =
      `SELECT AVG(${cohortMetric}) AS metric_value ` +
      `FROM player_season_statistics cohort_pss ` +
      `INNER JOIN players cohort_player ON cohort_player.id = cohort_pss.player_id ` +
      `WHERE ${whereClause} ` +
      `GROUP BY cohort_pss.player_id`;
  } else {
    const seasonParam = `p${context.paramCounter++}`;
    const competitionParam = `p${context.paramCounter++}`;
    const positionsParam = `p${context.paramCounter++}`;
    cohortParams[seasonParam] = node.cohort.seasonId;
    cohortParams[competitionParam] = node.cohort.competitionId;
    cohortParams[positionsParam] = node.cohort.position;

    cohortValuesSql =
      `SELECT AVG(${cohortMetric}) AS metric_value ` +
      `FROM player_season_statistics cohort_pss ` +
      `INNER JOIN players cohort_player ON cohort_player.id = cohort_pss.player_id ` +
      `WHERE cohort_pss.season_id = :${seasonParam} ` +
      `AND cohort_pss.competition_id = :${competitionParam} ` +
      `AND cohort_player.primary_position IN (:...${positionsParam}) ` +
      `AND ${cohortMetric} IS NOT NULL ` +
      `GROUP BY cohort_pss.player_id`;
  }

  let comparisonSql: string;
  const comparisonValueParams: Record<string, unknown> = {};
  if (node.comparison.type === 'AVERAGE') {
    comparisonSql =
      `candidate_metric ${sqlOperator(node.comparison.operator)} ` +
      `(SELECT AVG(cohort_values.metric_value) FROM (${cohortValuesSql}) cohort_values)`;
  } else if (node.comparison.type === 'MEDIAN') {
    comparisonSql =
      `candidate_metric ${sqlOperator(node.comparison.operator)} ` +
      `(SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cohort_values.metric_value) ` +
      `FROM (${cohortValuesSql}) cohort_values)`;
  } else if (node.comparison.type === 'PERCENTILE') {
    const percentileParam = `p${context.paramCounter++}`;
    comparisonValueParams[percentileParam] = (node.comparison.value ?? 0) / 100;
    comparisonSql =
      `candidate_metric ${sqlOperator(node.comparison.operator)} ` +
      `(SELECT PERCENTILE_CONT(:${percentileParam}) WITHIN GROUP (ORDER BY cohort_values.metric_value) ` +
      `FROM (${cohortValuesSql}) cohort_values)`;
  } else {
    const rankParam = `p${context.paramCounter++}`;
    comparisonValueParams[rankParam] = node.comparison.value;
    const betterOperator = rankingDirection === 'DESC' ? '>' : '<';
    comparisonSql =
      `(SELECT COALESCE(` +
      `MIN(ranked.player_rank) FILTER (WHERE ranked.metric_value = candidate_metric), ` +
      `COUNT(*) FILTER (WHERE ranked.metric_value ${betterOperator} candidate_metric) + 1` +
      `) FROM (` +
      `SELECT ranked_values.metric_value, RANK() OVER (ORDER BY ranked_values.metric_value ${rankingDirection}) AS player_rank ` +
      `FROM (${cohortValuesSql}) ranked_values` +
      `) ranked) ` +
      `${sqlOperator(node.comparison.operator)} :${rankParam}`;
  }

  const candidateScope: string[] = [];
  const candidateParams: Record<string, unknown> = {};
  if (context.scope?.seasonId) {
    const param = `p${context.paramCounter++}`;
    candidateScope.push(`candidate_pss.season_id = :${param}`);
    candidateParams[param] = context.scope.seasonId;
  }
  if (context.scope?.competitionId) {
    const param = `p${context.paramCounter++}`;
    candidateScope.push(`candidate_pss.competition_id = :${param}`);
    candidateParams[param] = context.scope.competitionId;
  }
  const candidateScopeSql = candidateScope.length
    ? ` AND ${candidateScope.join(' AND ')}`
    : '';
  const sql =
    `EXISTS (SELECT 1 FROM player_season_statistics candidate_pss ` +
    `WHERE candidate_pss.player_id = player.id${candidateScopeSql} ` +
    `AND ${candidateMetric} IS NOT NULL ` +
    `AND ${comparisonSql.replaceAll('candidate_metric', candidateMetric)})`;
  qb.where(sql, {
    ...cohortParams,
    ...comparisonValueParams,
    ...candidateParams,
  });
}

// ---------------------------------------------------------------------------
// MATCH_AGGREGATION builder (Task 2)
// ---------------------------------------------------------------------------

/**
 * Generates an EXISTS subquery for match-level aggregation.
 *
 * Pattern:
 *   EXISTS (
 *     SELECT 1
 *     FROM player_match_statistics pms
 *     INNER JOIN matches m ON m.id = pms.match_id
 *     WHERE pms.player_id = player.id
 *       [AND m.season_id = :scopeSeasonId]       ← scope filter (if provided)
 *       [AND m.competition_id = :scopeCompId]    ← scope filter (if provided)
 *     GROUP BY pms.player_id
 *     HAVING <aggregation> <op> :<threshold>
 *   )
 *
 * Aggregation types:
 *   COUNT  — COUNT(*) FILTER (WHERE <matchCriteria>)
 *   AVG    — AVG(CASE WHEN <matchCriteria> AND minutes_played > 0 THEN <avgField> END)
 *            Population: rows satisfying matchCriteria AND minutes_played > 0
 *            NULL rows (not played) are excluded by the CASE → AVG ignores NULLs.
 *   QUALIFYING_RATE — COUNT(*) FILTER (WHERE minutes_played > 0 AND <matchCriteria>) / NULLIF(COUNT(*) FILTER (WHERE minutes_played > 0), 0)
 *            Rate = qualifying matches / played matches; threshold is 0–1.
 *
 * All user values are bound as named parameters. No string concatenation.
 * Scope is applied from BuildContext, not from user input directly.
 */
function buildMatchAggregationNode(
  node: MatchAggregationCondition,
  qb: WhereExpressionBuilder,
  context: BuildContext,
): void {
  // 1. Build match criteria SQL clause
  const criteriaExpr = MATCH_METRIC_SQL_MAP[node.matchCriteria.field];
  const critParamName = `p${context.paramCounter++}`;
  const comparison = buildOperatorClause(
    criteriaExpr,
    node.matchCriteria.operator,
    node.matchCriteria.value,
    critParamName,
    context,
  );

  // 2. Build threshold parameter
  const thresholdName = `p${context.paramCounter++}`;
  const aggregateOperator = sqlOperator(node.aggregation.operator);

  // 3. Build aggregation SQL expression
  let aggregateSql: string;
  if (node.aggregation.type === 'COUNT') {
    // COUNT(*) FILTER is PostgreSQL syntax — counts only rows where matchCriteria holds.
    // NULL matchCriteria fields (e.g. rating IS NULL) are implicitly excluded by the comparison.
    aggregateSql = `COUNT(*) FILTER (WHERE ${comparison.sql})`;
  } else if (node.aggregation.type === 'QUALIFYING_RATE') {
    // Rate = qualifying played rows / rows where player actually played (minutes_played > 0)
    // NULLIF prevents division-by-zero when a player has zero played matches.
    aggregateSql =
      `CAST(COUNT(*) FILTER (WHERE pms.minutes_played > 0 AND ${comparison.sql}) AS DECIMAL) ` +
      `/ NULLIF(COUNT(*) FILTER (WHERE pms.minutes_played > 0), 0)`;
  } else {
    // AVG: average the aggregation.field over rows satisfying matchCriteria AND played.
    // CASE...WHEN yields NULL for non-qualifying rows; AVG ignores NULLs by SQL standard.
    const averageExpr = MATCH_METRIC_SQL_MAP[node.aggregation.field!];
    aggregateSql = `AVG(CASE WHEN pms.minutes_played > 0 AND ${comparison.sql} THEN ${averageExpr} END)`;
  }

  // 4. Build scope filter fragments (values already bound from context, not user input)
  const scopeWhere: string[] = [];
  const scopeParams: Record<string, unknown> = {};
  if (context.scope?.seasonId) {
    const scopeSeasonParam = `p${context.paramCounter++}`;
    scopeWhere.push(`m.season_id = :${scopeSeasonParam}`);
    scopeParams[scopeSeasonParam] = context.scope.seasonId;
  }
  if (context.scope?.competitionId) {
    const scopeCompParam = `p${context.paramCounter++}`;
    scopeWhere.push(`m.competition_id = :${scopeCompParam}`);
    scopeParams[scopeCompParam] = context.scope.competitionId;
  }

  const scopeSql =
    scopeWhere.length > 0 ? `\n    AND ${scopeWhere.join('\n    AND ')}` : '';

  // 5. Assemble the full EXISTS subquery
  // The matches JOIN is needed to support scope-aware filtering by season/competition.
  // player_match_statistics.match_id → matches.id → matches.season_id / competition_id
  const existsSql =
    `EXISTS (` +
    `SELECT 1 FROM player_match_statistics pms ` +
    `INNER JOIN matches m ON m.id = pms.match_id ` +
    `WHERE pms.player_id = player.id${scopeSql} ` +
    `GROUP BY pms.player_id ` +
    `HAVING ${aggregateSql} ${aggregateOperator} :${thresholdName}` +
    `)`;

  qb.where(existsSql, {
    ...comparison.params,
    ...scopeParams,
    [thresholdName]: node.aggregation.value,
  });
}

function sqlOperator(
  operator: MatchAggregationCondition['aggregation']['operator'],
): string {
  const map: Record<string, string> = {
    EQ: '=',
    NE: '!=',
    GT: '>',
    GTE: '>=',
    LT: '<',
    LTE: '<=',
  };
  return map[operator];
}

// ---------------------------------------------------------------------------
// GROUP builder
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CONDITION builder
// ---------------------------------------------------------------------------

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

export function getMetricSqlExpression(key: string): string | undefined {
  return METRIC_SQL_MAP[key]?.expression;
}

export function findRankMetric(
  node: QueryNode,
): { metric: string; direction: 'ASC' | 'DESC' } | null {
  if (node.kind === 'COHORT_COMPARISON' && node.comparison.type === 'RANK') {
    const dir = getMetric(node.metric)?.rankingDirection ?? 'DESC';
    return { metric: node.metric, direction: dir };
  }
  if (node.kind === 'GROUP') {
    for (const child of node.conditions) {
      const found = findRankMetric(child);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Export for testing
// ---------------------------------------------------------------------------

export { METRIC_SQL_MAP, MATCH_METRIC_SQL_MAP };
