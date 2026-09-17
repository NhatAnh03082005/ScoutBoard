/**
 * ScoutBoard — Player Query Validator
 *
 * Pure domain service: validates an untrusted incoming query tree against
 * the metric registry. Has no TypeORM or SQL knowledge.
 *
 * Entry point: validateQueryNode(node) — recursively validates the entire tree.
 * Throws BadRequestException with a safe, non-SQL-leaking message on failure.
 */

import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  type FieldCondition,
  type GroupNode,
  type QueryNode,
  type ConditionOperator,
  type ConditionValue,
  type MatchAggregationCondition,
  type CohortComparisonCondition,
} from './player-query.types';
import { getMetric, isValidOperatorForMetric } from './player-metric.registry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_BOOLEAN_OPERATORS = new Set(['AND', 'OR']);
const VALID_CONDITION_OPERATORS = new Set<ConditionOperator>([
  'EQ',
  'NE',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'NOT_IN',
  'BETWEEN',
]);
const ARRAY_OPERATORS = new Set<ConditionOperator>(['IN', 'NOT_IN']);
const SCALAR_OPERATORS = new Set<ConditionOperator>([
  'EQ',
  'NE',
  'GT',
  'GTE',
  'LT',
  'LTE',
]);
const COHORT_POSITIONS = new Set([
  'GK',
  'LB',
  'CB',
  'RB',
  'LWB',
  'RWB',
  'CM',
  'CDM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
]);

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

/**
 * Validates an untrusted query node (raw JSON body value).
 * Recursively validates GROUP children.
 * Throws BadRequestException on any violation.
 *
 * Returns the validated node cast to QueryNode when valid.
 */
export function validateQueryNode(node: unknown): QueryNode {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new BadRequestException('Query node must be a non-null object.');
  }

  const obj = node as Record<string, unknown>;
  const kind = obj['kind'];

  if (kind === 'GROUP') {
    return validateGroupNode(obj);
  } else if (kind === 'CONDITION') {
    return validateFieldCondition(obj, false);
  } else if (kind === 'MATCH_AGGREGATION') {
    return validateMatchAggregationCondition(obj);
  } else if (kind === 'COHORT_COMPARISON') {
    return validateCohortComparisonCondition(obj);
  } else {
    throw new BadRequestException(
      `Invalid query node kind. Received: ${JSON.stringify(kind)}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// GROUP validation
// ---------------------------------------------------------------------------

function validateGroupNode(obj: Record<string, unknown>): GroupNode {
  const operator = obj['operator'];

  if (!VALID_BOOLEAN_OPERATORS.has(operator as string)) {
    throw new BadRequestException(
      `Group node "operator" must be "AND" or "OR". Received: ${JSON.stringify(operator)}.`,
    );
  }

  const conditions = obj['conditions'];

  if (!Array.isArray(conditions)) {
    throw new BadRequestException('Group node "conditions" must be an array.');
  }

  if (conditions.length === 0) {
    throw new BadRequestException(
      'Group node "conditions" must not be empty. Add at least one condition or nested group.',
    );
  }

  // Recursively validate each child
  const validatedChildren: QueryNode[] = conditions.map((child, idx) => {
    try {
      return validateQueryNode(child);
    } catch (err: any) {
      throw new BadRequestException(
        `Invalid node at conditions[${idx}]: ${err?.message ?? 'unknown error'}`,
      );
    }
  });

  return {
    kind: 'GROUP',
    operator: operator as 'AND' | 'OR',
    conditions: validatedChildren,
  };
}

// ---------------------------------------------------------------------------
// CONDITION validation
// ---------------------------------------------------------------------------

function validateFieldCondition(
  obj: Record<string, unknown>,
  requireMatchMetric: boolean,
): FieldCondition {
  const field = obj['field'];
  const operator = obj['operator'];
  const value = obj['value'];

  // --- Validate field ---
  if (typeof field !== 'string' || field.trim() === '') {
    throw new BadRequestException(
      'Condition "field" must be a non-empty string.',
    );
  }

  const cleanField = field.trim();

  // Field must be a registered metric — rejects SQL expressions, column references, etc.
  const metricDef = getMetric(cleanField);
  if (!metricDef) {
    throw new BadRequestException(
      `Unknown query field: "${cleanField}". Only registered player metrics are allowed.`,
    );
  }
  if (requireMatchMetric && metricDef.sourceType !== 'MATCH_STAT') {
    throw new BadRequestException(
      `Match criteria field "${cleanField}" must be a registered match metric.`,
    );
  }
  if (!requireMatchMetric && metricDef.sourceType === 'MATCH_STAT') {
    throw new BadRequestException(
      `Match metric "${cleanField}" is only valid inside a MATCH_AGGREGATION node.`,
    );
  }

  // --- Validate operator ---
  if (!VALID_CONDITION_OPERATORS.has(operator as ConditionOperator)) {
    throw new BadRequestException(
      `Invalid operator: "${operator}". Valid operators are: ${[...VALID_CONDITION_OPERATORS].join(', ')}.`,
    );
  }

  const op = operator as ConditionOperator;

  if (!isValidOperatorForMetric(cleanField, op)) {
    throw new BadRequestException(
      `Operator "${op}" is not valid for metric "${cleanField}" (type: ${metricDef.dataType}). ` +
        `Valid operators for this metric: ${metricDef.allowedOperators.join(', ')}.`,
    );
  }

  // --- Validate value ---
  validateConditionValue(cleanField, op, value, metricDef);

  return {
    kind: 'CONDITION',
    field: cleanField,
    operator: op,
    value: value as ConditionValue,
  };
}

function validateMatchAggregationCondition(
  obj: Record<string, unknown>,
): MatchAggregationCondition {
  const criteria = obj['matchCriteria'];
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
    throw new BadRequestException(
      'MATCH_AGGREGATION "matchCriteria" must be a condition object.',
    );
  }
  const validatedCriteria = validateFieldCondition(
    criteria as Record<string, unknown>,
    true,
  );
  const aggregation = obj['aggregation'];
  if (
    !aggregation ||
    typeof aggregation !== 'object' ||
    Array.isArray(aggregation)
  ) {
    throw new BadRequestException(
      'MATCH_AGGREGATION "aggregation" must be an object.',
    );
  }
  const agg = aggregation as Record<string, unknown>;
  const type = agg['type'];
  const operator = agg['operator'];
  const value = agg['value'];
  if (type !== 'COUNT' && type !== 'AVG' && type !== 'QUALIFYING_RATE') {
    throw new BadRequestException(
      'MATCH_AGGREGATION type must be COUNT, AVG, or QUALIFYING_RATE.',
    );
  }
  if (!['EQ', 'NE', 'GT', 'GTE', 'LT', 'LTE'].includes(operator as string)) {
    throw new BadRequestException(
      'MATCH_AGGREGATION operator must be a scalar comparison operator.',
    );
  }
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new BadRequestException(
      'MATCH_AGGREGATION value must be a finite number.',
    );
  }
  if (type === 'QUALIFYING_RATE' && (value < 0 || value > 1)) {
    throw new BadRequestException(
      'QUALIFYING_RATE value must be between 0 and 1.',
    );
  }
  const field = agg['field'];
  if (type === 'AVG') {
    if (
      typeof field !== 'string' ||
      getMetric(field)?.sourceType !== 'MATCH_STAT'
    ) {
      throw new BadRequestException(
        'AVG aggregation requires a registered match metric "field".',
      );
    }
    if (getMetric(field)?.dataType !== 'NUMBER') {
      throw new BadRequestException(
        'AVG aggregation field must be a NUMBER match metric.',
      );
    }
  } else if (field !== undefined) {
    throw new BadRequestException(
      'Only AVG aggregation accepts an aggregation field.',
    );
  }
  return {
    kind: 'MATCH_AGGREGATION',
    matchCriteria: validatedCriteria,
    aggregation: {
      type,
      operator: operator as any,
      value,
      ...(type === 'AVG' ? { field: field } : {}),
    },
  };
}

function validateCohortComparisonCondition(
  obj: Record<string, unknown>,
): CohortComparisonCondition {
  const metric = obj['metric'];
  if (typeof metric !== 'string' || metric.trim() === '') {
    throw new BadRequestException(
      'COHORT_COMPARISON "metric" must be a non-empty string.',
    );
  }
  const metricDef = getMetric(metric.trim());
  if (
    !metricDef ||
    metricDef.sourceType !== 'SEASON_STAT' ||
    metricDef.dataType !== 'NUMBER'
  ) {
    throw new BadRequestException(
      'COHORT_COMPARISON metric must be a registered numeric season metric.',
    );
  }

  const comparison = obj['comparison'];
  if (
    !comparison ||
    typeof comparison !== 'object' ||
    Array.isArray(comparison)
  ) {
    throw new BadRequestException(
      'COHORT_COMPARISON "comparison" must be an object.',
    );
  }
  const comparisonObj = comparison as Record<string, unknown>;
  const type = comparisonObj['type'];
  const operator = comparisonObj['operator'];
  if (
    type !== 'AVERAGE' &&
    type !== 'MEDIAN' &&
    type !== 'PERCENTILE' &&
    type !== 'RANK'
  ) {
    throw new BadRequestException(
      'COHORT_COMPARISON type must be AVERAGE, MEDIAN, PERCENTILE, or RANK.',
    );
  }
  if (!SCALAR_OPERATORS.has(operator as ConditionOperator)) {
    throw new BadRequestException(
      'COHORT_COMPARISON operator must be a scalar comparison operator.',
    );
  }
  if (
    type === 'PERCENTILE' &&
    (typeof comparisonObj['value'] !== 'number' ||
      !isFinite(comparisonObj['value']) ||
      comparisonObj['value'] < 0 ||
      comparisonObj['value'] > 100)
  ) {
    throw new BadRequestException(
      'PERCENTILE value must be between 0 and 100.',
    );
  }
  if (
    type === 'RANK' &&
    (typeof comparisonObj['value'] !== 'number' ||
      !Number.isInteger(comparisonObj['value']) ||
      comparisonObj['value'] < 1)
  ) {
    throw new BadRequestException(
      'RANK value must be an integer greater than or equal to 1.',
    );
  }
  if (
    type !== 'PERCENTILE' &&
    type !== 'RANK' &&
    comparisonObj['value'] !== undefined
  ) {
    throw new BadRequestException(
      'AVERAGE and MEDIAN do not accept a comparison value.',
    );
  }

  const cohort = obj['cohort'];
  if (!cohort || typeof cohort !== 'object' || Array.isArray(cohort)) {
    throw new BadRequestException(
      'COHORT_COMPARISON "cohort" must be an object.',
    );
  }
  const cohortObj = cohort as Record<string, unknown>;

  if (cohortObj['context'] === true) {
    return {
      kind: 'COHORT_COMPARISON',
      metric: metric.trim(),
      comparison: {
        type,
        operator: operator as Exclude<
          ConditionOperator,
          'IN' | 'NOT_IN' | 'BETWEEN'
        >,
        ...(type === 'PERCENTILE' || type === 'RANK'
          ? { value: comparisonObj['value'] as number }
          : {}),
      },
      cohort: {
        context: true,
      },
    };
  }

  if (
    typeof cohortObj['competitionId'] !== 'string' ||
    cohortObj['competitionId'].trim() === '' ||
    !isUUID(cohortObj['competitionId']) ||
    typeof cohortObj['seasonId'] !== 'string' ||
    cohortObj['seasonId'].trim() === '' ||
    !isUUID(cohortObj['seasonId'])
  ) {
    throw new BadRequestException(
      'COHORT_COMPARISON cohort requires competitionId and seasonId.',
    );
  }
  if (
    !Array.isArray(cohortObj['position']) ||
    cohortObj['position'].length === 0 ||
    cohortObj['position'].some(
      (position) =>
        typeof position !== 'string' || !COHORT_POSITIONS.has(position),
    )
  ) {
    throw new BadRequestException(
      'COHORT_COMPARISON cohort.position must contain canonical positions only.',
    );
  }

  return {
    kind: 'COHORT_COMPARISON',
    metric: metric.trim(),
    comparison: {
      type,
      operator: operator as Exclude<
        ConditionOperator,
        'IN' | 'NOT_IN' | 'BETWEEN'
      >,
      ...(type === 'PERCENTILE' || type === 'RANK'
        ? { value: comparisonObj['value'] as number }
        : {}),
    },
    cohort: {
      competitionId: cohortObj['competitionId'],
      seasonId: cohortObj['seasonId'],
      position: cohortObj['position'] as string[],
    },
  };
}

// ---------------------------------------------------------------------------
// VALUE validation
// ---------------------------------------------------------------------------

function validateConditionValue(
  field: string,
  op: ConditionOperator,
  value: unknown,
  metricDef: ReturnType<typeof getMetric>,
): void {
  if (!metricDef) return; // Already caught above

  if (op === 'BETWEEN') {
    validateBetweenValue(field, value);
    return;
  }

  if (ARRAY_OPERATORS.has(op)) {
    validateArrayValue(field, op, value, metricDef);
    return;
  }

  if (SCALAR_OPERATORS.has(op)) {
    validateScalarValue(field, op, value, metricDef);
    return;
  }
}

function validateBetweenValue(field: string, value: unknown): void {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    !isFinite(value[0]) ||
    !isFinite(value[1])
  ) {
    throw new BadRequestException(
      `BETWEEN value for "${field}" must be a [min, max] array of two finite numbers.`,
    );
  }

  if (value[0] > value[1]) {
    throw new BadRequestException(
      `BETWEEN value for "${field}" is invalid: min (${value[0]}) must be <= max (${value[1]}).`,
    );
  }
}

function validateArrayValue(
  field: string,
  op: ConditionOperator,
  value: unknown,
  metricDef: NonNullable<ReturnType<typeof getMetric>>,
): void {
  if (!Array.isArray(value)) {
    throw new BadRequestException(
      `${op} operator on "${field}" requires an array value.`,
    );
  }

  if (value.length === 0) {
    throw new BadRequestException(
      `${op} operator on "${field}" requires a non-empty array.`,
    );
  }

  const expectedType =
    metricDef.dataType === 'NUMBER'
      ? 'number'
      : metricDef.dataType === 'BOOLEAN'
        ? 'boolean'
        : 'string';
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== expectedType) {
      throw new BadRequestException(
        `${op} value for "${field}" must be an array of ${expectedType}s. ` +
          `Item at index ${i} is ${typeof item}.`,
      );
    }
    if (expectedType === 'number' && !isFinite(item as number)) {
      throw new BadRequestException(
        `${op} value for "${field}" must contain only finite numbers. ` +
          `Item at index ${i} is not finite.`,
      );
    }
    if (
      metricDef.dataType === 'ENUM' &&
      metricDef.enumValues &&
      !metricDef.enumValues.includes(item as string)
    ) {
      throw new BadRequestException(
        `Invalid value "${item}" for metric "${field}". ` +
          `Valid values: ${metricDef.enumValues.join(', ')}.`,
      );
    }
  }
}

function validateScalarValue(
  field: string,
  op: ConditionOperator,
  value: unknown,
  metricDef: NonNullable<ReturnType<typeof getMetric>>,
): void {
  if (Array.isArray(value)) {
    throw new BadRequestException(
      `Operator "${op}" on "${field}" expects a scalar value, not an array.`,
    );
  }

  if (metricDef.dataType === 'NUMBER') {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new BadRequestException(
        `Value for "${field}" must be a finite number. Received: ${JSON.stringify(value)}.`,
      );
    }
    return;
  }

  if (metricDef.dataType === 'BOOLEAN') {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`Value for "${field}" must be a boolean.`);
    }
    return;
  }

  if (metricDef.dataType === 'ENUM') {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        `Value for ENUM metric "${field}" must be a string. Received: ${typeof value}.`,
      );
    }
    if (metricDef.enumValues && metricDef.enumValues.length > 0) {
      if (!(metricDef.enumValues as string[]).includes(value)) {
        throw new BadRequestException(
          `Invalid value "${value}" for metric "${field}". ` +
            `Valid values: ${metricDef.enumValues.join(', ')}.`,
        );
      }
    }
    return;
  }

  if (metricDef.dataType === 'STRING') {
    if (typeof value !== 'string') {
      throw new BadRequestException(
        `Value for "${field}" must be a string. Received: ${typeof value}.`,
      );
    }
    if (value.trim() === '') {
      throw new BadRequestException(
        `Value for "${field}" must not be an empty string.`,
      );
    }
    return;
  }
}

// ---------------------------------------------------------------------------
// Pagination validation
// ---------------------------------------------------------------------------

export function validatePaginationParams(
  limit?: number,
  offset?: number,
): { limit: number; offset: number } {
  const resolvedLimit = limit ?? 20;
  const resolvedOffset = offset ?? 0;

  if (
    !Number.isInteger(resolvedLimit) ||
    resolvedLimit < 1 ||
    resolvedLimit > 100
  ) {
    throw new BadRequestException(
      'pagination.limit must be an integer between 1 and 100.',
    );
  }

  if (!Number.isInteger(resolvedOffset) || resolvedOffset < 0) {
    throw new BadRequestException(
      'pagination.offset must be a non-negative integer.',
    );
  }

  return { limit: resolvedLimit, offset: resolvedOffset };
}
