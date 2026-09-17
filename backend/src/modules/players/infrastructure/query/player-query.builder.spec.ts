import { Brackets } from 'typeorm';
import { buildWhereClause, createBuildContext } from './player-query.builder';
import type { QueryNode } from 'src/modules/players/domain/query/player-query.types';

type WhereCall = {
  method: 'where' | 'andWhere' | 'orWhere';
  condition: string | Brackets;
  parameters?: Record<string, unknown>;
};

function captureWhere(
  node: QueryNode,
  scope?: { seasonId?: string; competitionId?: string },
) {
  const calls: WhereCall[] = [];
  const root = {
    andWhere: (
      condition: string | Brackets,
      parameters?: Record<string, unknown>,
    ) => {
      calls.push({ method: 'andWhere', condition, parameters });
      return root;
    },
    innerJoin: jest.fn().mockReturnThis(),
  } as any;

  buildWhereClause(node, root, createBuildContext(scope));
  return { calls, root };
}

function renderWhere(brackets: Brackets): WhereCall[] {
  const calls: WhereCall[] = [];
  const nested = {
    where: (
      condition: string | Brackets,
      parameters?: Record<string, unknown>,
    ) => {
      calls.push({ method: 'where', condition, parameters });
      return nested;
    },
    andWhere: (
      condition: string | Brackets,
      parameters?: Record<string, unknown>,
    ) => {
      calls.push({ method: 'andWhere', condition, parameters });
      return nested;
    },
    orWhere: (
      condition: string | Brackets,
      parameters?: Record<string, unknown>,
    ) => {
      calls.push({ method: 'orWhere', condition, parameters });
      return nested;
    },
  } as any;

  brackets.whereFactory(nested);
  return calls;
}

function leafSql(condition: string | Brackets): string {
  if (typeof condition === 'string') return condition;
  const inner = renderWhere(condition);
  if (inner.length > 0 && typeof inner[0].condition === 'string') {
    return inner[0].condition;
  }
  return '';
}

function aggregationNode(
  type: 'COUNT' | 'AVG' | 'QUALIFYING_RATE',
  aggregation: Record<string, unknown>,
): QueryNode {
  return {
    kind: 'MATCH_AGGREGATION',
    matchCriteria: {
      kind: 'CONDITION',
      field: 'match_rating',
      operator: 'GTE',
      value: 7,
    },
    aggregation: { type, ...aggregation } as any,
  };
}

describe('player query builder match aggregation SQL', () => {
  it('builds COUNT per player and preserves season/competition scope', () => {
    const { calls } = captureWhere(
      aggregationNode('COUNT', { operator: 'GTE', value: 5 }),
      { seasonId: 'season-1', competitionId: 'competition-1' },
    );
    const call = renderWhere(calls[0].condition as Brackets)[0];

    expect(call.condition).toContain(
      'EXISTS (SELECT 1 FROM player_match_statistics pms',
    );
    expect(call.condition).toContain('WHERE pms.player_id = player.id');
    expect(call.condition).toContain('m.season_id = :p2');
    expect(call.condition).toContain('m.competition_id = :p3');
    expect(call.condition).toContain(
      'COUNT(*) FILTER (WHERE pms.rating >= :p0) >= :p1',
    );
    expect(call.parameters).toEqual({
      p0: 7,
      p1: 5,
      p2: 'season-1',
      p3: 'competition-1',
    });
  });

  it('builds AVG over qualifying played rows and leaves NULL ratings to AVG', () => {
    const { calls } = captureWhere(
      aggregationNode('AVG', {
        operator: 'GTE',
        value: 7.2,
        field: 'match_rating',
      }),
    );
    const call = renderWhere(calls[0].condition as Brackets)[0];

    expect(call.condition).toContain(
      'AVG(CASE WHEN pms.minutes_played > 0 AND pms.rating >= :p0 THEN pms.rating END) >= :p1',
    );
  });

  it('builds QUALIFYING_RATE with played rows as the denominator', () => {
    const { calls } = captureWhere(
      aggregationNode('QUALIFYING_RATE', { operator: 'GTE', value: 0.7 }),
    );
    const call = renderWhere(calls[0].condition as Brackets)[0];

    expect(call.condition).toContain(
      'COUNT(*) FILTER (WHERE pms.minutes_played > 0 AND pms.rating >= :p0) AS DECIMAL',
    );
    expect(call.condition).toContain(
      'NULLIF(COUNT(*) FILTER (WHERE pms.minutes_played > 0), 0)',
    );
  });

  it('keeps aggregation nodes inside nested AND/OR brackets', () => {
    const { calls } = captureWhere({
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
            aggregationNode('COUNT', { operator: 'GTE', value: 3 }),
          ],
        },
        aggregationNode('AVG', {
          operator: 'GTE',
          value: 7.2,
          field: 'match_rating',
        }),
      ],
    });
    const outer = renderWhere(calls[0].condition as Brackets);
    const orGroup = outer[0].condition as Brackets;
    const nestedCalls = renderWhere(orGroup);

    expect(nestedCalls[1].method).toBe('orWhere');
    expect((nestedCalls[1].condition as Brackets).whereFactory).toBeDefined();
    expect(outer[1].method).toBe('andWhere');
  });

  it.each(['AVERAGE', 'MEDIAN'] as const)(
    'builds an independent %s cohort baseline with bound scope and positions',
    (baseline) => {
      const { calls } = captureWhere({
        kind: 'COHORT_COMPARISON',
        metric: 'goals_per90',
        comparison: { type: baseline, operator: 'GTE' },
        cohort: {
          competitionId: 'competition-1',
          seasonId: 'season-1',
          position: ['CM', 'CDM'],
        },
      });
      const call = renderWhere(calls[0].condition as Brackets)[0];

      expect(call.condition).toContain(
        'EXISTS (SELECT 1 FROM player_season_statistics candidate_pss',
      );
      expect(call.condition).toContain('INNER JOIN players cohort_player');
      expect(call.condition).toContain('cohort_pss.season_id = :p0');
      expect(call.condition).toContain('cohort_pss.competition_id = :p1');
      expect(call.condition).toContain(
        'cohort_player.primary_position IN (:...p2)',
      );
      expect(call.condition).toContain('GROUP BY cohort_pss.player_id');
      expect(call.condition).toContain(
        baseline === 'AVERAGE'
          ? 'AVG(cohort_values.metric_value)'
          : 'PERCENTILE_CONT(0.5)',
      );
      expect(call.condition).not.toContain('candidate_pss.goals_per90 >= :p');
      expect(call.parameters).toEqual({
        p0: 'season-1',
        p1: 'competition-1',
        p2: ['CM', 'CDM'],
      });
    },
  );

  it('keeps cohort comparison composable with match aggregation and candidate scope', () => {
    const { calls } = captureWhere(
      {
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'COHORT_COMPARISON',
            metric: 'goals_per90',
            comparison: { type: 'MEDIAN', operator: 'GTE' },
            cohort: {
              competitionId: 'cohort-comp',
              seasonId: 'cohort-season',
              position: ['ST'],
            },
          },
          aggregationNode('COUNT', { operator: 'GTE', value: 3 }),
        ],
      },
      { competitionId: 'candidate-comp', seasonId: 'candidate-season' },
    );
    const outer = renderWhere(calls[0].condition as Brackets);
    const cohortSql = renderWhere(outer[0].condition as Brackets)[0]
      .condition as string;
    const matchSql = renderWhere(outer[1].condition as Brackets)[0]
      .condition as string;

    expect(cohortSql).toContain('candidate_pss.season_id = :p3');
    expect(cohortSql).toContain('candidate_pss.competition_id = :p4');
    expect(matchSql).toContain('m.season_id = :p7');
    expect(matchSql).toContain('m.competition_id = :p8');
  });

  it.each([10, 50, 90])(
    'builds P%d SQL with a bound normalized percentile',
    (percentile) => {
      const { calls } = captureWhere({
        kind: 'COHORT_COMPARISON',
        metric: 'goals_per90',
        comparison: { type: 'PERCENTILE', operator: 'GTE', value: percentile },
        cohort: {
          competitionId: 'competition-1',
          seasonId: 'season-1',
          position: ['ST'],
        },
      });
      const call = renderWhere(calls[0].condition as Brackets)[0];

      expect(call.condition).toContain('PERCENTILE_CONT(:p3) WITHIN GROUP');
      expect(call.parameters).toMatchObject({ p3: percentile / 100 });
      expect(call.condition).toContain('candidate_pss.goals_per_90 >=');
      expect(call.condition).toContain('cohort_pss.goals_per_90 IS NOT NULL');
    },
  );

  it('keeps candidate predicates outside the cohort population', () => {
    const { calls } = captureWhere({
      kind: 'GROUP',
      operator: 'AND',
      conditions: [
        { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'PERCENTILE', operator: 'GTE', value: 90 },
          cohort: {
            competitionId: 'competition-1',
            seasonId: 'season-1',
            position: ['ST', 'CF'],
          },
        },
      ],
    });
    const outer = renderWhere(calls[0].condition as Brackets);
    const cohortSql = renderWhere(outer[1].condition as Brackets)[0]
      .condition as string;

    expect(cohortSql).toContain('cohort_player.primary_position IN (:...p2)');
    expect(cohortSql).not.toContain('date_of_birth');
    expect(cohortSql).not.toContain('age(');
  });

  it('builds rank SQL over the cohort distribution with DESC direction', () => {
    const { calls } = captureWhere({
      kind: 'COHORT_COMPARISON',
      metric: 'goals_per90',
      comparison: { type: 'RANK', operator: 'LTE', value: 10 },
      cohort: {
        competitionId: 'competition-1',
        seasonId: 'season-1',
        position: ['ST', 'CF'],
      },
    });
    const call = renderWhere(calls[0].condition as Brackets)[0];

    expect(call.condition).toContain(
      'RANK() OVER (ORDER BY ranked_values.metric_value DESC)',
    );
    expect(call.condition).toContain('MIN(ranked.player_rank) FILTER');
    expect(call.condition).not.toContain('UNION ALL SELECT candidate_pss');
    expect(call.condition).toContain(') <= :p3');
    expect(call.parameters).toMatchObject({ p3: 10 });
  });

  it('uses ASC rank direction for lower-is-better registered metrics', () => {
    const { calls } = captureWhere({
      kind: 'COHORT_COMPARISON',
      metric: 'goals_conceded_per90',
      comparison: { type: 'RANK', operator: 'LTE', value: 1 },
      cohort: {
        competitionId: 'competition-1',
        seasonId: 'season-1',
        position: ['GK'],
      },
    });
    const call = renderWhere(calls[0].condition as Brackets)[0];

    expect(call.condition).toContain(
      'RANK() OVER (ORDER BY ranked_values.metric_value ASC)',
    );
  });

  it('composes condition, match aggregation, cohort comparison, and nested groups', () => {
    const { calls } = captureWhere({
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
        aggregationNode('COUNT', { operator: 'GTE', value: 5 }),
        {
          kind: 'COHORT_COMPARISON',
          metric: 'goals_per90',
          comparison: { type: 'PERCENTILE', operator: 'GTE', value: 90 },
          cohort: {
            competitionId: 'competition-1',
            seasonId: 'season-1',
            position: ['CM', 'CDM'],
          },
        },
      ],
    });
    const root = renderWhere(calls[0].condition as Brackets);
    const nestedOr = renderWhere(root[0].condition as Brackets);
    const matchSql = renderWhere(root[2].condition as Brackets)[0]
      .condition as string;
    const cohortSql = renderWhere(root[3].condition as Brackets)[0]
      .condition as string;

    expect(root.map((call) => call.method)).toEqual([
      'where',
      'andWhere',
      'andWhere',
      'andWhere',
    ]);
    expect(nestedOr.map((call) => call.method)).toEqual(['where', 'orWhere']);
    expect(matchSql).toContain(
      'EXISTS (SELECT 1 FROM player_match_statistics pms',
    );
    expect(cohortSql).toContain('PERCENTILE_CONT(:p');
    expect(cohortSql).toContain('cohort_player.primary_position IN');
  });

  it('preserves OR branch precedence for complex branches', () => {
    const { calls } = captureWhere({
      kind: 'GROUP',
      operator: 'OR',
      conditions: [
        {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 21 },
            {
              kind: 'COHORT_COMPARISON',
              metric: 'goals_per90',
              comparison: { type: 'PERCENTILE', operator: 'GTE', value: 90 },
              cohort: {
                competitionId: 'competition-1',
                seasonId: 'season-1',
                position: ['ST'],
              },
            },
          ],
        },
        {
          kind: 'GROUP',
          operator: 'AND',
          conditions: [
            { kind: 'CONDITION', field: 'age', operator: 'LTE', value: 23 },
            aggregationNode('COUNT', { operator: 'GTE', value: 10 }),
          ],
        },
      ],
    });
    const root = renderWhere(calls[0].condition as Brackets);

    expect(root.map((call) => call.method)).toEqual(['where', 'orWhere']);
    expect(
      renderWhere(root[0].condition as Brackets).map((call) => call.method),
    ).toEqual(['where', 'andWhere']);
    expect(
      renderWhere(root[1].condition as Brackets).map((call) => call.method),
    ).toEqual(['where', 'andWhere']);
  });

  describe('Task 4.2.1 — Advanced Search Scope & Club Semantics', () => {
    it('builds competition OR with stat join on pss.competition_id', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'OR',
        conditions: [
          {
            kind: 'CONDITION',
            field: 'competition',
            operator: 'EQ',
            value: 'comp-1',
          },
          {
            kind: 'CONDITION',
            field: 'competition',
            operator: 'EQ',
            value: 'comp-2',
          },
        ],
      });
      expect(root.innerJoin).toHaveBeenCalledWith(
        'player_season_statistics',
        'pss',
        'pss.player_id = player.id',
      );
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual(['where', 'orWhere']);
      expect(leafSql(rendered[0].condition)).toBe('pss.competition_id = :p0');
      expect(leafSql(rendered[1].condition)).toBe('pss.competition_id = :p1');
    });

    it('builds club OR without stat join on player.current_team_id', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'OR',
        conditions: [
          { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-1' },
          { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-2' },
        ],
      });
      expect(root.innerJoin).not.toHaveBeenCalled();
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual(['where', 'orWhere']);
      expect(leafSql(rendered[0].condition)).toBe(
        'player.current_team_id = :p0',
      );
      expect(leafSql(rendered[1].condition)).toBe(
        'player.current_team_id = :p1',
      );
    });

    it('builds competition AND club with stat join', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'CONDITION',
            field: 'competition',
            operator: 'EQ',
            value: 'comp-1',
          },
          { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-1' },
        ],
      });
      expect(root.innerJoin).toHaveBeenCalledWith(
        'player_season_statistics',
        'pss',
        'pss.player_id = player.id',
      );
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual(['where', 'andWhere']);
      expect(leafSql(rendered[0].condition)).toBe('pss.competition_id = :p0');
      expect(leafSql(rendered[1].condition)).toBe(
        'player.current_team_id = :p1',
      );
    });

    it('builds competition AND position with stat join', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'CONDITION',
            field: 'competition',
            operator: 'EQ',
            value: 'comp-1',
          },
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        ],
      });
      expect(root.innerJoin).toHaveBeenCalled();
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual(['where', 'andWhere']);
      expect(leafSql(rendered[0].condition)).toBe('pss.competition_id = :p0');
      expect(leafSql(rendered[1].condition)).toBe(
        'player.primaryPosition = :p1',
      );
    });

    it('builds club AND position without stat join', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          { kind: 'CONDITION', field: 'club', operator: 'EQ', value: 'club-1' },
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'ST' },
        ],
      });
      expect(root.innerJoin).not.toHaveBeenCalled();
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual(['where', 'andWhere']);
      expect(leafSql(rendered[0].condition)).toBe(
        'player.current_team_id = :p0',
      );
      expect(leafSql(rendered[1].condition)).toBe(
        'player.primaryPosition = :p1',
      );
    });

    it('builds full composition: (competition A OR B) AND (club X OR Y) AND position = CM', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'competition',
                operator: 'EQ',
                value: 'comp-A',
              },
              {
                kind: 'CONDITION',
                field: 'competition',
                operator: 'EQ',
                value: 'comp-B',
              },
            ],
          },
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'club',
                operator: 'EQ',
                value: 'club-X',
              },
              {
                kind: 'CONDITION',
                field: 'club',
                operator: 'EQ',
                value: 'club-Y',
              },
            ],
          },
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
        ],
      });
      expect(root.innerJoin).toHaveBeenCalledWith(
        'player_season_statistics',
        'pss',
        'pss.player_id = player.id',
      );
      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.map((c) => c.method)).toEqual([
        'where',
        'andWhere',
        'andWhere',
      ]);

      // Check competition OR group
      const compGroup = renderWhere(rendered[0].condition as Brackets);
      expect(compGroup.map((c) => c.method)).toEqual(['where', 'orWhere']);
      expect(leafSql(compGroup[0].condition)).toBe('pss.competition_id = :p0');
      expect(leafSql(compGroup[1].condition)).toBe('pss.competition_id = :p1');

      // Check club OR group
      const clubGroup = renderWhere(rendered[1].condition as Brackets);
      expect(clubGroup.map((c) => c.method)).toEqual(['where', 'orWhere']);
      expect(leafSql(clubGroup[0].condition)).toBe(
        'player.current_team_id = :p2',
      );
      expect(leafSql(clubGroup[1].condition)).toBe(
        'player.current_team_id = :p3',
      );

      // Check position
      expect(leafSql(rendered[2].condition)).toBe(
        'player.primaryPosition = :p4',
      );
    });
  });

  describe('Task 4.3: Candidate Context Ranking & Statistic Ranges', () => {
    it('builds range condition with BETWEEN operator', () => {
      const { calls } = captureWhere({
        kind: 'CONDITION',
        field: 'goals_per90',
        operator: 'BETWEEN',
        value: [0.2, 0.5],
      });
      const call = renderWhere(calls[0].condition as Brackets)[0];
      expect(call.condition).toBe('pss.goals_per_90 BETWEEN :p1 AND :p2');
      expect(call.parameters).toEqual({ p1: 0.2, p2: 0.5 });
    });

    it('builds candidate context ranking SQL with position, competition, and range', () => {
      const { calls, root } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'CONDITION',
            field: 'competition',
            operator: 'EQ',
            value: 'comp-1',
          },
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
          {
            kind: 'CONDITION',
            field: 'goals_per90',
            operator: 'GTE',
            value: 0.2,
          },
          {
            kind: 'COHORT_COMPARISON',
            metric: 'goals_per90',
            comparison: { type: 'RANK', operator: 'LTE', value: 10 },
            cohort: { context: true },
          },
        ],
      });

      // Verifies pss join was added
      expect(root.innerJoin).toHaveBeenCalledWith(
        'player_season_statistics',
        'pss',
        'pss.player_id = player.id',
      );

      const rendered = renderWhere(calls[0].condition as Brackets);
      expect(rendered.length).toBe(4);

      // The 4th condition is the COHORT_COMPARISON
      const cohortSql = leafSql(rendered[3].condition);
      expect(cohortSql).toContain(
        'EXISTS (SELECT 1 FROM player_season_statistics candidate_pss',
      );
      expect(cohortSql).toContain(
        'RANK() OVER (ORDER BY ranked_values.metric_value DESC) AS player_rank',
      );

      // Check that cohortValuesSql incorporates the sibling candidate conditions on cohort_pss/cohort_player
      expect(cohortSql).toContain('cohort_pss.competition_id =');
      expect(cohortSql).toContain('cohort_player.primary_position =');
      expect(cohortSql).toContain('cohort_pss.goals_per_90 >=');
      expect(cohortSql).toContain('cohort_pss.goals_per_90 IS NOT NULL');
      expect(cohortSql).toContain('candidate_pss.goals_per_90 IS NOT NULL');
    });

    it('builds candidate context ranking with club and competition OR groups', () => {
      const { calls } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'competition',
                operator: 'EQ',
                value: 'comp-A',
              },
              {
                kind: 'CONDITION',
                field: 'competition',
                operator: 'EQ',
                value: 'comp-B',
              },
            ],
          },
          {
            kind: 'GROUP',
            operator: 'OR',
            conditions: [
              {
                kind: 'CONDITION',
                field: 'club',
                operator: 'EQ',
                value: 'club-X',
              },
              {
                kind: 'CONDITION',
                field: 'club',
                operator: 'EQ',
                value: 'club-Y',
              },
            ],
          },
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
          {
            kind: 'COHORT_COMPARISON',
            metric: 'goals_per90',
            comparison: { type: 'RANK', operator: 'LTE', value: 10 },
            cohort: { context: true },
          },
        ],
      });

      const rendered = renderWhere(calls[0].condition as Brackets);
      const cohortSql = leafSql(rendered[3].condition);

      // Verifies both OR groups are projected into the cohort distribution subquery
      expect(cohortSql).toContain('(cohort_pss.competition_id =');
      expect(cohortSql).toContain(') OR (cohort_pss.competition_id =');
      expect(cohortSql).toContain('(cohort_player.current_team_id =');
      expect(cohortSql).toContain(') OR (cohort_player.current_team_id =');
    });

    it('uses ASC ranking direction for lower-is-better metrics in candidate context', () => {
      const { calls } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'GK' },
          {
            kind: 'COHORT_COMPARISON',
            metric: 'goals_conceded_per90',
            comparison: { type: 'RANK', operator: 'LTE', value: 5 },
            cohort: { context: true },
          },
        ],
      });

      const rendered = renderWhere(calls[0].condition as Brackets);
      const cohortSql = leafSql(rendered[1].condition);

      expect(cohortSql).toContain(
        'RANK() OVER (ORDER BY ranked_values.metric_value ASC) AS player_rank',
      );
    });

    it('excludes NULL metrics in both candidate filter and cohortValuesSql', () => {
      const { calls } = captureWhere({
        kind: 'GROUP',
        operator: 'AND',
        conditions: [
          { kind: 'CONDITION', field: 'position', operator: 'EQ', value: 'CM' },
          {
            kind: 'COHORT_COMPARISON',
            metric: 'assists_per90',
            comparison: { type: 'RANK', operator: 'LTE', value: 10 },
            cohort: { context: true },
          },
        ],
      });

      const rendered = renderWhere(calls[0].condition as Brackets);
      const cohortSql = leafSql(rendered[1].condition);

      expect(cohortSql).toContain('cohort_pss.assists_per_90 IS NOT NULL');
      expect(cohortSql).toContain('candidate_pss.assists_per_90 IS NOT NULL');
    });
  });
});
