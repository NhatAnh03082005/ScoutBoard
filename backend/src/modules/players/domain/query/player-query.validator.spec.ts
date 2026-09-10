/**
 * player-query.validator.spec.ts
 *
 * Tests the pure domain validator — no DB, no NestJS application context.
 */

import { BadRequestException } from '@nestjs/common';
import { validateQueryNode, validatePaginationParams } from './player-query.validator';
import type { GroupNode, FieldCondition } from './player-query.types';

// ---------------------------------------------------------------------------
// VALID TREES
// ---------------------------------------------------------------------------

describe('validateQueryNode — valid inputs', () => {
  it('accepts a single-condition AND group', () => {
    const node: GroupNode = {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
      ],
    };
    expect(() => validateQueryNode(node)).not.toThrow();
    const result = validateQueryNode(node) as GroupNode;
    expect(result.kind).toBe('GROUP');
    expect(result.conditions).toHaveLength(1);
  });

  it('accepts a nested OR-inside-AND tree', () => {
    const node: GroupNode = {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'OR',
          conditions: [
            { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
            { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CDM' },
          ],
        },
        { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 900 },
      ],
    };
    expect(() => validateQueryNode(node)).not.toThrow();
    const result = validateQueryNode(node) as GroupNode;
    expect(result.conditions).toHaveLength(2);
    expect((result.conditions[0] as GroupNode).operator).toBe('OR');
  });

  it('accepts a BETWEEN condition with valid [min, max]', () => {
    const node: FieldCondition = {
      kind: 'CONDITION',
      field: 'height_cm',
      operator: 'BETWEEN',
      value: [170, 190],
    };
    expect(() => validateQueryNode(node)).not.toThrow();
  });

  it('accepts a BETWEEN condition on a NUMBER metric (goals)', () => {
    const node: FieldCondition = {
      kind: 'CONDITION',
      field: 'goals',
      operator: 'BETWEEN',
      value: [5, 20],
    };
    expect(() => validateQueryNode(node)).not.toThrow();
  });

  it('accepts an IN condition for an ENUM metric (position)', () => {
    const node: FieldCondition = {
      kind: 'CONDITION',
      field: 'position',
      operator: 'IN',
      value: ['CM', 'CAM', 'CDM'],
    };
    expect(() => validateQueryNode(node)).not.toThrow();
  });

  it('accepts EQ condition for STRING metric (nationality)', () => {
    const node: FieldCondition = {
      kind: 'CONDITION',
      field: 'nationality',
      operator: 'EQ',
      value: 'England',
    };
    expect(() => validateQueryNode(node)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// INVALID FIELDS
// ---------------------------------------------------------------------------

describe('validateQueryNode — unknown / injection fields', () => {
  const cases = [
    ['player.age', 'dotted column reference'],
    ['1=1; DROP TABLE players', 'SQL injection'],
    ['', 'empty string'],
    ['goals; DELETE FROM users', 'SQL injection in real field name'],
  ];

  test.each(cases)('rejects field "%s" (%s)', (field) => {
    const node = {
      kind: 'CONDITION',
      field,
      operator: 'EQ',
      value: 1,
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// INVALID OPERATORS
// ---------------------------------------------------------------------------

describe('validateQueryNode — invalid operators', () => {
  it('rejects unknown operator string', () => {
    const node = {
      kind: 'CONDITION',
      field: 'age',
      operator: 'CONTAINS',
      value: 20,
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects GTE on an ENUM metric (position)', () => {
    const node = {
      kind: 'CONDITION',
      field: 'position',
      operator: 'GTE',
      value: 'CM',
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects BETWEEN on an ENUM metric', () => {
    const node = {
      kind: 'CONDITION',
      field: 'position',
      operator: 'BETWEEN',
      value: ['CM', 'CDM'],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// INVALID VALUE SHAPES
// ---------------------------------------------------------------------------

describe('validateQueryNode — invalid value shapes', () => {
  it('rejects BETWEEN with only one value', () => {
    const node = {
      kind: 'CONDITION',
      field: 'age',
      operator: 'BETWEEN',
      value: [18],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects BETWEEN where min > max', () => {
    const node = {
      kind: 'CONDITION',
      field: 'age',
      operator: 'BETWEEN',
      value: [30, 20],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects IN with empty array', () => {
    const node = {
      kind: 'CONDITION',
      field: 'goals',
      operator: 'IN',
      value: [],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects GT with string value for NUMBER metric', () => {
    const node = {
      kind: 'CONDITION',
      field: 'age',
      operator: 'GT',
      value: 'twenty',
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects scalar operator with array value', () => {
    const node = {
      kind: 'CONDITION',
      field: 'age',
      operator: 'EQ',
      value: [20, 25],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects invalid ENUM value when enumValues list is specified', () => {
    const node = {
      kind: 'CONDITION',
      field: 'position',
      operator: 'EQ',
      value: 'MIDFIELDER', // not a canonical position code
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// STRUCTURAL ERRORS
// ---------------------------------------------------------------------------

describe('validateQueryNode — structural errors', () => {
  it('rejects null input', () => {
    expect(() => validateQueryNode(null)).toThrow(BadRequestException);
  });

  it('rejects array input', () => {
    expect(() => validateQueryNode([{ kind: 'CONDITION' }])).toThrow(BadRequestException);
  });

  it('rejects invalid kind', () => {
    expect(() => validateQueryNode({ kind: 'FILTER', field: 'age' })).toThrow(BadRequestException);
  });

  it('rejects GROUP with empty conditions', () => {
    const node = { kind: 'GROUP', operator: 'AND', conditions: [] };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects GROUP with invalid operator', () => {
    const node = {
      kind: 'GROUP',
      operator: 'NOT',
      conditions: [{ kind: 'CONDITION', field: 'age', operator: 'GT', value: 18 }],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('correctly surfaces the index of a deeply nested invalid node', () => {
    const node = {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'age', operator: 'GT', value: 18 },
        { kind: 'CONDITION', field: 'INVALID_FIELD', operator: 'EQ', value: 'x' },
      ],
    };
    expect(() => validateQueryNode(node)).toThrow(/conditions\[1\]/);
  });
});

// ---------------------------------------------------------------------------
// PAGINATION VALIDATOR
// ---------------------------------------------------------------------------

describe('validatePaginationParams', () => {
  it('uses defaults when called with no args', () => {
    const result = validatePaginationParams();
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it('accepts valid limit and offset', () => {
    const result = validatePaginationParams(50, 40);
    expect(result).toEqual({ limit: 50, offset: 40 });
  });

  it('rejects limit > 100', () => {
    expect(() => validatePaginationParams(101)).toThrow(BadRequestException);
  });

  it('rejects limit < 1', () => {
    expect(() => validatePaginationParams(0)).toThrow(BadRequestException);
  });

  it('rejects negative offset', () => {
    expect(() => validatePaginationParams(20, -1)).toThrow(BadRequestException);
  });

  it('rejects non-integer limit', () => {
    expect(() => validatePaginationParams(10.5)).toThrow(BadRequestException);
  });
});
