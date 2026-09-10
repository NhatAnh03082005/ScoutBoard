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
import {
  type FieldCondition,
  type GroupNode,
  type QueryNode,
  type ConditionOperator,
  type ConditionValue,
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
    return validateFieldCondition(obj);
  } else {
    throw new BadRequestException(
      `Invalid query node: "kind" must be "GROUP" or "CONDITION". Received: ${JSON.stringify(kind)}.`,
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

function validateFieldCondition(obj: Record<string, unknown>): FieldCondition {
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
    validateArrayValue(field, op, value, metricDef.dataType);
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
  dataType: string,
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

  const expectedType = dataType === 'NUMBER' ? 'number' : 'string';
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
