import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PLAYER_POSITIONS,
  type PlayerPosition,
  type QueryNode,
  type FieldCondition,
} from '../../../types/player.types';
import {
  TACTICAL_POSITION_GROUPS,
  buildSearchQueryNode,
  type TopNConfig,
} from './query-composition.utils';

describe('Position Taxonomy Safety & Serialization Regression', () => {
  const PROHIBITED_NON_CANONICAL_VALUES = [
    'DEF',
    'MID',
    'ATT',
    'FWD',
    'DM',
    'AM',
    'SS',
    'Goalkeepers',
    'Defenders',
    'Midfielders',
    'Attackers',
  ];

  const emptyTopN: TopNConfig = {
    enabled: false,
    preset: 10,
    customValue: '',
    metricKey: '',
  };

  // Helper to recursively collect all position condition values in a QueryNode tree
  function collectPositionConditionValues(node: QueryNode): string[] {
    const values: string[] = [];

    function traverse(n: QueryNode) {
      if (n.kind === 'CONDITION') {
        if (n.field === 'position' && typeof n.value === 'string') {
          values.push(n.value);
        }
      } else if (n.kind === 'GROUP') {
        n.conditions.forEach(traverse);
      }
    }

    traverse(node);
    return values;
  }

  // =========================================================================
  // 1. Canonical Backend Position Taxonomy
  // =========================================================================
  describe('Canonical Backend Position Taxonomy (15 Values)', () => {
    it('contains EXACTLY 15 canonical position codes', () => {
      expect(CANONICAL_PLAYER_POSITIONS.length).toBe(15);
    });

    it('matches the exact expected canonical taxonomy set', () => {
      const expectedSet = new Set([
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

      expect(new Set(CANONICAL_PLAYER_POSITIONS)).toEqual(expectedSet);
    });

    it('does NOT contain any category codes or aliases like DEF, MID, ATT, FWD, DM, AM, SS', () => {
      PROHIBITED_NON_CANONICAL_VALUES.forEach((prohibited) => {
        expect(CANONICAL_PLAYER_POSITIONS).not.toContain(prohibited);
      });
    });
  });

  // =========================================================================
  // 2. UI Groupings Isolation
  // =========================================================================
  describe('TACTICAL_POSITION_GROUPS UI Separation', () => {
    it('contains 4 UI display groups (Goalkeepers, Defenders, Midfielders, Attackers)', () => {
      const groupNames = TACTICAL_POSITION_GROUPS.map((g) => g.name);
      expect(groupNames).toEqual(['Goalkeepers', 'Defenders', 'Midfielders', 'Attackers']);
    });

    it('ensures every position defined in UI groups uses a strict canonical code', () => {
      const allCodes: string[] = [];

      TACTICAL_POSITION_GROUPS.forEach((group) => {
        group.positions.forEach((pos) => {
          allCodes.push(pos.code);
          expect(CANONICAL_PLAYER_POSITIONS).toContain(pos.code);
          expect(PROHIBITED_NON_CANONICAL_VALUES).not.toContain(pos.code);
        });
      });

      // All 15 canonical positions must be represented across the 4 groups without duplicates
      expect(allCodes.length).toBe(15);
      expect(new Set(allCodes).size).toBe(15);
    });
  });

  // =========================================================================
  // 3. Query Serialization Safety (Zero Non-Canonical Leakage)
  // =========================================================================
  describe('Query Serialization Safety in buildSearchQueryNode', () => {
    CANONICAL_PLAYER_POSITIONS.forEach((pos: PlayerPosition) => {
      it(`serializes position condition with canonical code '${pos}'`, () => {
        const query = buildSearchQueryNode([], [], pos, [], emptyTopN);
        const positionValues = collectPositionConditionValues(query);

        expect(positionValues).toEqual([pos]);

        // Assert that the serialized condition satisfies canonical taxonomy
        const posCondition = query.conditions.find(
          (c) => c.kind === 'CONDITION' && (c as FieldCondition).field === 'position',
        ) as FieldCondition;
        expect(posCondition).toBeDefined();
        expect(CANONICAL_PLAYER_POSITIONS).toContain(posCondition.value);
      });
    });

    it('never emits DEF, MID, ATT, FWD, DM, AM, SS or UI group labels into serialized position conditions', () => {
      // Test when each canonical position is serialized
      CANONICAL_PLAYER_POSITIONS.forEach((pos: PlayerPosition) => {
        const query = buildSearchQueryNode([], [], pos, [], emptyTopN);
        const positionValues = collectPositionConditionValues(query);

        PROHIBITED_NON_CANONICAL_VALUES.forEach((prohibited) => {
          expect(positionValues).not.toContain(prohibited);
        });
      });

      // Test fallback/empty state
      const emptyQuery = buildSearchQueryNode([], [], null, [], emptyTopN);
      const emptyPosValues = collectPositionConditionValues(emptyQuery);
      expect(emptyPosValues).toEqual([]);
    });
  });
});
