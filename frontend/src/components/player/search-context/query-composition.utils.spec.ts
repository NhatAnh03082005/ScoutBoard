import { describe, it, expect } from 'vitest';
import {
  buildSearchQueryNode,
  buildSearchScope,
  validateRangeRow,
  TOP_N_PRESETS,
  type StatisticRangeRow,
  type TopNConfig,
} from './query-composition.utils';
import type {
  GroupNode,
  FieldCondition,
  CohortComparisonCondition,
  PlayerPosition,
} from '../../../types/player.types';

describe('Query Composition Utilities (query-composition.utils)', () => {
  const emptyTopN: TopNConfig = {
    enabled: false,
    preset: 10,
    customValue: '',
    metricKey: '',
  };

  // =========================================================================
  // 1. buildSearchScope
  // =========================================================================
  describe('buildSearchScope', () => {
    it('returns { competitionId } when exactly 1 competition is selected', () => {
      expect(buildSearchScope(['comp-laliga'])).toEqual({ competitionId: 'comp-laliga' });
    });

    it('returns undefined when 0 competitions are selected', () => {
      expect(buildSearchScope([])).toBeUndefined();
    });

    it('returns undefined when multiple competitions are selected', () => {
      expect(buildSearchScope(['comp-1', 'comp-2'])).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. validateRangeRow
  // =========================================================================
  describe('validateRangeRow', () => {
    it('returns undefined for valid non-negative numbers', () => {
      expect(validateRangeRow('5', '10')).toBeUndefined();
      expect(validateRangeRow('0', '0')).toBeUndefined();
      expect(validateRangeRow('10', '')).toBeUndefined();
      expect(validateRangeRow('', '20')).toBeUndefined();
      expect(validateRangeRow('', '')).toBeUndefined();
      expect(validateRangeRow(' 15 ', ' 25 ')).toBeUndefined();
    });

    it('returns error when from or to is not a valid number', () => {
      expect(validateRangeRow('abc', '10')).toBe('Please enter a valid number.');
      expect(validateRangeRow('10', 'xyz')).toBe('Please enter a valid number.');
    });

    it('returns error when values are negative', () => {
      expect(validateRangeRow('-1', '10')).toBe('Value cannot be negative.');
      expect(validateRangeRow('5', '-2')).toBe('Value cannot be negative.');
    });

    it('returns error when minimum is greater than maximum', () => {
      expect(validateRangeRow('20', '10')).toBe(
        'Minimum value cannot be greater than maximum value.',
      );
    });
  });

  // =========================================================================
  // 3. TOP_N_PRESETS
  // =========================================================================
  describe('TOP_N_PRESETS', () => {
    it('contains expected default ranking presets and custom option', () => {
      expect(TOP_N_PRESETS).toEqual([1, 5, 10, 15, 20, 25, 50, 'custom']);
    });
  });

  // =========================================================================
  // 4. buildSearchQueryNode (Criteria Composition Matrix)
  // =========================================================================
  describe('buildSearchQueryNode Composition Matrix', () => {
    // A. Competition only
    it('Case A1: Single competition produces a single EQ condition', () => {
      const node = buildSearchQueryNode(['comp-1'], [], null, [], emptyTopN);
      expect(node.kind).toBe('GROUP');
      expect(node.operator).toBe('AND');
      expect(node.conditions).toHaveLength(1);

      const cond = node.conditions[0] as FieldCondition;
      expect(cond).toEqual({
        kind: 'CONDITION',
        field: 'competition',
        operator: 'EQ',
        value: 'comp-1',
      });
    });

    it('Case A2: Multiple competitions produce an OR group of EQ conditions', () => {
      const node = buildSearchQueryNode(['comp-1', 'comp-2'], [], null, [], emptyTopN);
      expect(node.kind).toBe('GROUP');
      expect(node.operator).toBe('AND');
      expect(node.conditions).toHaveLength(1);

      const orGroup = node.conditions[0] as GroupNode;
      expect(orGroup.kind).toBe('GROUP');
      expect(orGroup.operator).toBe('OR');
      expect(orGroup.conditions).toEqual([
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: 'comp-1' },
        { kind: 'CONDITION', field: 'competition', operator: 'EQ', value: 'comp-2' },
      ]);
    });

    // B. Club only
    it('Case B1: Single club produces a single EQ condition', () => {
      const node = buildSearchQueryNode([], ['club-barca'], null, [], emptyTopN);
      expect(node.conditions).toHaveLength(1);

      const cond = node.conditions[0] as FieldCondition;
      expect(cond).toEqual({
        kind: 'CONDITION',
        field: 'club',
        operator: 'EQ',
        value: 'club-barca',
      });
    });

    it('Case B2: Multiple clubs produce an OR group of EQ conditions', () => {
      const node = buildSearchQueryNode([], ['club-1', 'club-2'], null, [], emptyTopN);
      expect(node.conditions).toHaveLength(1);

      const orGroup = node.conditions[0] as GroupNode;
      expect(orGroup.kind).toBe('GROUP');
      expect(orGroup.operator).toBe('OR');
      expect(orGroup.conditions).toEqual([
        { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-1' },
        { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-2' },
      ]);
    });

    // C. Position only
    it('Case C: Position only produces a single EQ condition with canonical position', () => {
      const canonicalPos: PlayerPosition = 'ST';
      const node = buildSearchQueryNode([], [], canonicalPos, [], emptyTopN);
      expect(node.conditions).toHaveLength(1);

      const cond = node.conditions[0] as FieldCondition;
      expect(cond).toEqual({
        kind: 'CONDITION',
        field: 'position',
        operator: 'EQ',
        value: 'ST',
      });
    });

    // D. Competition + Club
    it('Case D: Competition + Club combines both in root AND group', () => {
      const node = buildSearchQueryNode(['comp-1'], ['club-1'], null, [], emptyTopN);
      expect(node.conditions).toHaveLength(2);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'competition',
        operator: 'EQ',
        value: 'comp-1',
      });
      expect(node.conditions[1]).toEqual({
        kind: 'CONDITION',
        field: 'club',
        operator: 'EQ',
        value: 'club-1',
      });
    });

    // E. Competition + Position
    it('Case E: Competition + Position combines both in root AND group', () => {
      const node = buildSearchQueryNode(['comp-1'], [], 'CM', [], emptyTopN);
      expect(node.conditions).toHaveLength(2);
      expect(node.conditions[0]).toMatchObject({ field: 'competition', value: 'comp-1' });
      expect(node.conditions[1]).toMatchObject({ field: 'position', value: 'CM' });
    });

    // F. Club + Position
    it('Case F: Club + Position combines both in root AND group', () => {
      const node = buildSearchQueryNode([], ['club-1'], 'CB', [], emptyTopN);
      expect(node.conditions).toHaveLength(2);
      expect(node.conditions[0]).toMatchObject({ field: 'club', value: 'club-1' });
      expect(node.conditions[1]).toMatchObject({ field: 'position', value: 'CB' });
    });

    // G. Competition + Club + Position
    it('Case G: Competition + Club + Position combines all three in root AND group', () => {
      const node = buildSearchQueryNode(['comp-1', 'comp-2'], ['club-1'], 'GK', [], emptyTopN);
      expect(node.conditions).toHaveLength(3);
      expect(node.conditions[0]).toMatchObject({ kind: 'GROUP', operator: 'OR' });
      expect(node.conditions[1]).toMatchObject({ kind: 'CONDITION', field: 'club', value: 'club-1' });
      expect(node.conditions[2]).toMatchObject({ kind: 'CONDITION', field: 'position', value: 'GK' });
    });

    // H. Statistic ranges
    it('Case H1: Range with both from and to produces BETWEEN condition', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'goals', from: '5', to: '15' },
      ];
      const node = buildSearchQueryNode([], [], null, rows, emptyTopN);
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'goals',
        operator: 'BETWEEN',
        value: [5, 15],
      });
    });

    it('Case H2: Range with identical from and to produces EQ condition', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'goals', from: '10', to: '10' },
      ];
      const node = buildSearchQueryNode([], [], null, rows, emptyTopN);
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'goals',
        operator: 'EQ',
        value: 10,
      });
    });

    it('Case H3: Range with from only produces GTE condition', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'minutes', from: '900', to: '' },
      ];
      const node = buildSearchQueryNode([], [], null, rows, emptyTopN);
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'minutes',
        operator: 'GTE',
        value: 900,
      });
    });

    it('Case H4: Range with to only produces LTE condition', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'yellow_cards', from: '', to: '3' },
      ];
      const node = buildSearchQueryNode([], [], null, rows, emptyTopN);
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'yellow_cards',
        operator: 'LTE',
        value: 3,
      });
    });

    // I. Multiple statistic ranges
    it('Case I: Multiple statistic ranges are all appended to root AND group', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'goals', from: '10', to: '' },
        { id: '2', metricKey: 'assists', from: '5', to: '' },
        { id: '3', metricKey: 'minutes', from: '500', to: '1500' },
      ];
      const node = buildSearchQueryNode([], [], null, rows, emptyTopN);
      expect(node.conditions).toHaveLength(3);
      expect(node.conditions[0]).toMatchObject({ field: 'goals', operator: 'GTE', value: 10 });
      expect(node.conditions[1]).toMatchObject({ field: 'assists', operator: 'GTE', value: 5 });
      expect(node.conditions[2]).toMatchObject({ field: 'minutes', operator: 'BETWEEN', value: [500, 1500] });
    });

    // J. Top N Ranking condition
    it('Case J: Top N produces a COHORT_COMPARISON node with RANK LTE', () => {
      const topNConfig: TopNConfig = {
        enabled: true,
        preset: 10,
        customValue: '',
        metricKey: 'goals',
      };
      const node = buildSearchQueryNode([], [], null, [], topNConfig, 10);
      expect(node.conditions).toHaveLength(1);

      const topNCond = node.conditions[0] as CohortComparisonCondition;
      expect(topNCond).toEqual({
        kind: 'COHORT_COMPARISON',
        metric: 'goals',
        comparison: {
          type: 'RANK',
          operator: 'LTE',
          value: 10,
        },
        cohort: {
          context: true,
        },
      });
    });

    // K. Top N + filters
    it('Case K: Top N combined with position and competition filters', () => {
      const topNConfig: TopNConfig = {
        enabled: true,
        preset: 5,
        customValue: '',
        metricKey: 'assists',
      };
      const node = buildSearchQueryNode(['comp-1'], [], 'CAM', [], topNConfig, 5);
      expect(node.conditions).toHaveLength(3);
      expect(node.conditions[0]).toMatchObject({ field: 'competition', value: 'comp-1' });
      expect(node.conditions[1]).toMatchObject({ field: 'position', value: 'CAM' });
      expect(node.conditions[2]).toMatchObject({
        kind: 'COHORT_COMPARISON',
        metric: 'assists',
        comparison: { type: 'RANK', operator: 'LTE', value: 5 },
      });
    });

    // L. Invalid range handling (empty from and to are omitted)
    it('Case L: Empty range rows with neither from nor to are safely omitted', () => {
      const rows: StatisticRangeRow[] = [
        { id: '1', metricKey: 'goals', from: '', to: '' },
        { id: '2', metricKey: 'assists', from: '  ', to: '  ' },
      ];
      const node = buildSearchQueryNode(['comp-1'], [], null, rows, emptyTopN);
      // Only the competition condition should remain
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toMatchObject({ field: 'competition', value: 'comp-1' });
    });

    // M. Empty selection fallback
    it('Case M: Completely empty criteria falls back to appearances >= 0', () => {
      const node = buildSearchQueryNode([], [], null, [], emptyTopN);
      expect(node.kind).toBe('GROUP');
      expect(node.operator).toBe('AND');
      expect(node.conditions).toHaveLength(1);
      expect(node.conditions[0]).toEqual({
        kind: 'CONDITION',
        field: 'appearances',
        operator: 'GTE',
        value: 0,
      });
    });
  });
});
