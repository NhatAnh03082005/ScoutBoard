/**
 * player-query.validator.spec.ts
 *
 * Tests the pure domain validator — no DB, no NestJS application context.
 */

import { BadRequestException } from '@nestjs/common';
import {
  validateQueryNode,
  validatePaginationParams,
} from './player-query.validator';
import type { GroupNode, FieldCondition } from './player-query.types';

// ---------------------------------------------------------------------------
// VALID TREES
// ---------------------------------------------------------------------------

describe('validateQueryNode — valid inputs', () => {
  it('accepts a match COUNT aggregation leaf', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
      }),
    ).not.toThrow();
  });

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
            {
              kind: 'CONDITION',
              field: 'position',
              operator: 'EQ',
              value: 'CM',
            },
            {
              kind: 'CONDITION',
              field: 'position',
              operator: 'EQ',
              value: 'CDM',
            },
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

  it('rejects invalid ENUM values in IN arrays', () => {
    const node = {
      kind: 'CONDITION',
      field: 'position',
      operator: 'IN',
      value: ['CM', 'MIDFIELDER'],
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
    expect(() => validateQueryNode([{ kind: 'CONDITION' }])).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid kind', () => {
    expect(() => validateQueryNode({ kind: 'FILTER', field: 'age' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects GROUP with empty conditions', () => {
    const node = { kind: 'GROUP', operator: 'AND', conditions: [] };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('rejects GROUP with invalid operator', () => {
    const node = {
      kind: 'GROUP',
      operator: 'NOT',
      conditions: [
        { kind: 'CONDITION', field: 'age', operator: 'GT', value: 18 },
      ],
    };
    expect(() => validateQueryNode(node)).toThrow(BadRequestException);
  });

  it('correctly surfaces the index of a deeply nested invalid node', () => {
    const node = {
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'age', operator: 'GT', value: 18 },
        {
          kind: 'CONDITION',
          field: 'INVALID_FIELD',
          operator: 'EQ',
          value: 'x',
        },
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

// ---------------------------------------------------------------------------
// TASK 2 — MATCH_AGGREGATION VALIDATION
// ---------------------------------------------------------------------------

describe('validateQueryNode — MATCH_AGGREGATION valid inputs', () => {
  it('accepts COUNT with match_rating >= 7, threshold >= 5', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
      }),
    ).not.toThrow();
  });

  it('accepts COUNT with match_key_passes >= 3, threshold >= 3', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_key_passes',
          operator: 'GTE',
          value: 3,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 3 },
      }),
    ).not.toThrow();
  });

  it('accepts AVG aggregation with numeric field (match_rating) and explicit aggregation field', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_minutes_played',
          operator: 'GT',
          value: 0,
        },
        aggregation: {
          type: 'AVG',
          operator: 'GTE',
          value: 7.2,
          field: 'match_rating',
        },
      }),
    ).not.toThrow();
  });

  it('accepts QUALIFYING_RATE with 0–1 threshold', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'QUALIFYING_RATE', operator: 'GTE', value: 0.7 },
      }),
    ).not.toThrow();
  });

  it('accepts MATCH_AGGREGATION inside AND group (Test 4: age <= 23 AND COUNT >= 5)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_rating',
              operator: 'GTE',
              value: 7,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts complex tree: (position OR position) AND minutes AND MATCH_AGGREGATION (Test 5)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CM',
              },
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CDM',
              },
            ],
          },
          { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 900 },
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_rating',
              operator: 'GTE',
              value: 7,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts deeply nested: (age AND (goals_per90 OR assists_per90)) AND MATCH_AGGREGATION (Test 6)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'AND',
            conditions: [
              { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
              {
                kind: 'GROUP',
                operator: 'OR',
                conditions: [
                  {
                    kind: 'CONDITION',
                    field: 'goals_per90',
                    operator: 'GTE',
                    value: 0.2,
                  },
                  {
                    kind: 'CONDITION',
                    field: 'assists_per90',
                    operator: 'GTE',
                    value: 0.15,
                  },
                ],
              },
            ],
          },
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_rating',
              operator: 'GTE',
              value: 7,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts MATCH_AGGREGATION inside OR group (Test 7)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'OR',
        conditions: [
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_goals',
              operator: 'GTE',
              value: 2,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 3 },
          },
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_assists',
              operator: 'GTE',
              value: 2,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 3 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts COUNT with match_is_starter = true (boolean metric)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_is_starter',
          operator: 'EQ',
          value: true,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 10 },
      }),
    ).not.toThrow();
  });
});

describe('validateQueryNode — MATCH_AGGREGATION invalid inputs', () => {
  it('rejects MATCH_AGGREGATION with invalid match field (Test 10)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'unknown_field',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects MATCH_AGGREGATION with regular season stat in matchCriteria (Test 10 variant)', () => {
    // `goals` is a SEASON_STAT, not a MATCH_STAT — invalid in matchCriteria
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'goals',
          operator: 'GTE',
          value: 1,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 3 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects MATCH_AGGREGATION with invalid aggregation type (Test 11)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'SUM', operator: 'GTE', value: 5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects MATCH_AGGREGATION with invalid aggregation operator (Test 11)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'IN', value: 5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects QUALIFYING_RATE with value > 1 (Test 11)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'QUALIFYING_RATE', operator: 'GTE', value: 1.5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects AVG without required aggregation.field (Test 11)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'AVG', operator: 'GTE', value: 7.2 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects AVG with a season stat (not MATCH_STAT) as aggregation.field', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: {
          type: 'AVG',
          operator: 'GTE',
          value: 7.2,
          field: 'goals',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects COUNT with an extra aggregation.field (only AVG accepts field)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: {
          type: 'COUNT',
          operator: 'GTE',
          value: 5,
          field: 'match_goals',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects SQL injection in matchCriteria field (Test 12)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: '1=1; DROP TABLE matches',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects MATCH_STAT field in a regular CONDITION node (match_rating in top-level condition)', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          // match_rating is MATCH_STAT — not valid outside MATCH_AGGREGATION
          {
            kind: 'CONDITION',
            field: 'match_rating',
            operator: 'GTE',
            value: 7,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-numeric aggregation value', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
        aggregation: { type: 'COUNT', operator: 'GTE', value: 'five' },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing matchCriteria', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing aggregation', () => {
    expect(() =>
      validateQueryNode({
        kind: 'MATCH_AGGREGATION',
        matchCriteria: {
          kind: 'CONDITION',
          field: 'match_rating',
          operator: 'GTE',
          value: 7,
        },
      }),
    ).toThrow(BadRequestException);
  });
});

describe('validateQueryNode — COHORT_COMPARISON', () => {
  const validNode = {
    kind: 'COHORT_COMPARISON',
    metric: 'goals_per90',
    comparison: { type: 'AVERAGE', operator: 'GTE' },
    cohort: {
      competitionId: '11111111-1111-4111-8111-111111111111',
      seasonId: '22222222-2222-4222-8222-222222222222',
      position: ['CM', 'CDM'],
    },
  };

  it('accepts a numeric season metric and canonical scoped cohort', () => {
    expect(validateQueryNode(validNode)).toEqual(validNode);
  });

  it('accepts MEDIAN and preserves composition with nested nodes', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
          { ...validNode, comparison: { type: 'MEDIAN', operator: 'GTE' } },
        ],
      }),
    ).not.toThrow();
  });

  it.each([
    ['PERCENTILE', 0],
    ['PERCENTILE', 90],
    ['PERCENTILE', 100],
    ['RANK', 1],
    ['RANK', 10],
  ] as const)('accepts %s value %s', (type, value) => {
    expect(() =>
      validateQueryNode({
        ...validNode,
        comparison: { type, operator: type === 'RANK' ? 'LTE' : 'GTE', value },
      }),
    ).not.toThrow();
  });

  it('rejects invalid percentile and rank values', () => {
    expect(() =>
      validateQueryNode({
        ...validNode,
        comparison: { type: 'PERCENTILE', operator: 'GTE', value: -1 },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQueryNode({
        ...validNode,
        comparison: { type: 'PERCENTILE', operator: 'GTE', value: 101 },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQueryNode({
        ...validNode,
        comparison: { type: 'RANK', operator: 'LTE', value: 0 },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQueryNode({
        ...validNode,
        comparison: { type: 'RANK', operator: 'LTE', value: 1.5 },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-canonical cohort positions and missing scope', () => {
    expect(() =>
      validateQueryNode({
        ...validNode,
        cohort: { ...validNode.cohort, position: ['MID'] },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQueryNode({
        ...validNode,
        cohort: { ...validNode.cohort, seasonId: '' },
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts COHORT_COMPARISON with cohort: { context: true } without requiring fixed UUIDs', () => {
    const validated = validateQueryNode({
      kind: 'COHORT_COMPARISON',
      metric: 'goals_per90',
      comparison: { type: 'RANK', operator: 'LTE', value: 10 },
      cohort: { context: true },
    });
    expect(validated).toEqual({
      kind: 'COHORT_COMPARISON',
      metric: 'goals_per90',
      comparison: { type: 'RANK', operator: 'LTE', value: 10 },
      cohort: { context: true },
    });
  });

  it('rejects invalid rank values even when cohort: { context: true }', () => {
    expect(() =>
      validateQueryNode({
        kind: 'COHORT_COMPARISON',
        metric: 'goals_per90',
        comparison: { type: 'RANK', operator: 'LTE', value: 0 },
        cohort: { context: true },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects match metrics and unknown metrics', () => {
    expect(() =>
      validateQueryNode({ ...validNode, metric: 'match_rating' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQueryNode({ ...validNode, metric: 'not_a_metric' }),
    ).toThrow(BadRequestException);
  });

  it('validates a deeply nested tree containing all query node primitives', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CM',
              },
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CDM',
              },
            ],
          },
          { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
          {
            kind: 'MATCH_AGGREGATION',
            matchCriteria: {
              kind: 'CONDITION',
              field: 'match_rating',
              operator: 'GTE',
              value: 7,
            },
            aggregation: { type: 'COUNT', operator: 'GTE', value: 5 },
          },
          validNode,
        ],
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TASK 1 REGRESSION — verify Task 1 still works (Test 13)
// ---------------------------------------------------------------------------

describe('Task 1 regression — all existing query patterns still validate', () => {
  it('age <= 21', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'age',
        operator: 'LTE',
        value: 21,
      }),
    ).not.toThrow();
  });

  it('(CM OR CDM) AND age <= 23 AND minutes >= 900', () => {
    expect(() =>
      validateQueryNode({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CM',
              },
              {
                kind: 'CONDITION',
                field: 'position',
                operator: 'EQ',
                value: 'CDM',
              },
            ],
          },
          { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
          { kind: 'CONDITION', field: 'minutes', operator: 'GTE', value: 900 },
        ],
      }),
    ).not.toThrow();
  });

  it('goals_per90 >= 0.30', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'goals_per90',
        operator: 'GTE',
        value: 0.3,
      }),
    ).not.toThrow();
  });

  it('BETWEEN: height_cm between 185 and 200', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'height_cm',
        operator: 'BETWEEN',
        value: [185, 200],
      }),
    ).not.toThrow();
  });

  it('invalid field returns 400', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'invalid_field',
        operator: 'EQ',
        value: 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('SQL injection in field returns 400', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: '1=1; DROP TABLE players',
        operator: 'EQ',
        value: 1,
      }),
    ).toThrow(BadRequestException);
  });

  it('validates competition and club conditions with EQ and IN operators', () => {
    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'competition',
        operator: 'EQ',
        value: 'ad6261b7-7170-4824-aeed-edeb1e03a05f',
      }),
    ).not.toThrow();

    expect(() =>
      validateQueryNode({
        kind: 'CONDITION',
        field: 'club',
        operator: 'IN',
        value: [
          'b66fe9e9-c125-4442-9955-c16340d9d4d9',
          'cda76fec-8902-455b-92f9-e48823f1b6ff',
        ],
      }),
    ).not.toThrow();
  });
});
