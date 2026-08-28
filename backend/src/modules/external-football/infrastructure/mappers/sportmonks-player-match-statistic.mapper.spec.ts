import { SportmonksPlayerMatchStatisticMapper } from './sportmonks-player-match-statistic.mapper';
import {
  SportmonksFixtureDto,
  SportmonksLineupDto,
} from '../dto/sportmonks-fixture.dto';

describe('SportmonksPlayerMatchStatisticMapper (Task 6.3 Comprehensive)', () => {
  const sampleFixtureDto: SportmonksFixtureDto = {
    id: 18535518,
    name: 'Manchester United vs Manchester City',
    starting_at: '2026-08-22 19:00:00',
  };

  const sampleOutfieldLineup: SportmonksLineupDto = {
    id: 101,
    fixture_id: 18535518,
    player_id: 2001,
    team_id: 14,
    position_id: 27, // Forward
    formation_position: 9,
    type_id: 11, // Starter
    jersey_number: 7,
    player: {
      id: 2001,
      name: 'Cristiano Ronaldo',
      position_id: 27,
    },
    details: [
      { code: 'minutes-played', value: 90 },
      { code: 'rating', value: 8.245 }, // Exact float precision
      { code: 'goals', value: 2 },
      { code: 'assists', value: 1 },
      { code: 'shots-total', value: 5 },
      { code: 'shots-on-target', value: 3 },
      { code: 'passes-total', value: 40 },
      { code: 'passes-accurate', value: 35 },
      { code: 'key-passes', value: 2 },
      { code: 'tackles', value: 1 },
      { code: 'interceptions', value: 0 },
      { code: 'duels-won', value: 6 },
      { code: 'yellowcards', value: 1 },
      { code: 'redcards', value: 0 },
    ],
  };

  const sampleGkLineup: SportmonksLineupDto = {
    id: 102,
    fixture_id: 18535518,
    player_id: 1001,
    team_id: 14,
    position_id: 24, // Goalkeeper
    formation_position: 1,
    type_id: 11, // Starter
    jersey_number: 1,
    player: {
      id: 1001,
      name: 'David de Gea',
      position_id: 24,
    },
    details: [
      { code: 'minutes-played', value: 90 },
      { code: 'rating', value: 7.5 },
      { code: 'saves', value: 4 },
      { code: 'goals-conceded', value: 1 },
      { code: 'cleansheets', value: 0 },
      { code: 'penalties-saved', value: 1 },
      { code: 'penalties-faced', value: 1 },
      { code: 'passes-total', value: 25 },
      { code: 'passes-accurate', value: 20 },
    ],
  };

  it('TC-01: full outfield player mapping with strictly NULL GK fields', () => {
    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      sampleOutfieldLineup,
      sampleFixtureDto,
    );

    expect(result.externalProvider).toBe('SPORTMONKS');
    expect(result.playerExternalId).toBe('2001');
    expect(result.teamExternalId).toBe('14');
    expect(result.matchExternalId).toBe('18535518');
    expect(result.isStarter).toBe(true);
    expect(result.minutesPlayed).toBe(90);
    expect(result.rating).toBe(8.245);
    expect(result.goals).toBe(2);
    expect(result.assists).toBe(1);
    expect(result.shots).toBe(5);
    expect(result.shotsOnTarget).toBe(3);
    expect(result.passesAttempted).toBe(40);
    expect(result.passesCompleted).toBe(35);
    expect(result.keyPasses).toBe(2);
    expect(result.tackles).toBe(1);
    expect(result.interceptions).toBe(0);
    expect(result.duelsWon).toBe(6);
    expect(result.yellowCards).toBe(1);
    expect(result.redCards).toBe(0);

    // GK fields MUST be strictly NULL for outfield players
    expect(result.saves).toBeNull();
    expect(result.goalsConceded).toBeNull();
    expect(result.cleanSheets).toBeNull();
    expect(result.penaltiesSaved).toBeNull();
    expect(result.penaltiesFaced).toBeNull();
  });

  it('TC-02: full GK mapping with saves, goals conceded, clean sheet, penalties', () => {
    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      sampleGkLineup,
      sampleFixtureDto,
    );

    expect(result.playerExternalId).toBe('1001');
    expect(result.saves).toBe(4);
    expect(result.goalsConceded).toBe(1);
    expect(result.cleanSheets).toBe(0);
    expect(result.penaltiesSaved).toBe(1);
    expect(result.penaltiesFaced).toBe(1);
  });

  it('TC-03: substitute player who entered with partial minutes', () => {
    const subEntered: SportmonksLineupDto = {
      id: 104,
      fixture_id: 18535518,
      player_id: 4001,
      team_id: 14,
      type_id: 12, // Bench
      details: [
        { code: 'minutes-played', value: 25 },
        { code: 'goals', value: 1 },
        { code: 'rating', value: 7.1 },
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      subEntered,
      sampleFixtureDto,
    );

    expect(result.isStarter).toBe(false);
    expect(result.minutesPlayed).toBe(25);
    expect(result.goals).toBe(1);
    expect(result.rating).toBe(7.1);
  });

  it('TC-04: starter player substituted off with partial minutes', () => {
    const starterSubbedOff: SportmonksLineupDto = {
      ...sampleOutfieldLineup,
      details: [
        { code: 'minutes-played', value: 65 },
        { code: 'goals', value: 1 },
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      starterSubbedOff,
      sampleFixtureDto,
    );

    expect(result.isStarter).toBe(true);
    expect(result.minutesPlayed).toBe(65);
    expect(result.goals).toBe(1);
  });

  it('TC-05: player with 0 minutes (unused bench substitute)', () => {
    const benchUnused: SportmonksLineupDto = {
      id: 103,
      fixture_id: 18535518,
      player_id: 3001,
      team_id: 14,
      position_id: 26,
      type_id: 12, // Bench
      details: [],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      benchUnused,
      sampleFixtureDto,
    );

    expect(result.isStarter).toBe(false);
    expect(result.minutesPlayed).toBe(0);
    expect(result.goals).toBeNull();
    expect(result.assists).toBeNull();
    expect(result.rating).toBeNull();
  });

  it('TC-06 & TC-07: player with no statistics / missing individual statistics', () => {
    const partialLineup: SportmonksLineupDto = {
      id: 105,
      fixture_id: 18535518,
      player_id: 5001,
      team_id: 14,
      details: [
        { code: 'goals', value: 0 },
        { code: 'assists', value: null },
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      partialLineup,
      sampleFixtureDto,
    );

    expect(result.goals).toBe(0); // Explicit 0 remains 0
    expect(result.assists).toBeNull(); // Null remains null
    expect(result.shots).toBeNull(); // Missing stat is NULL
    expect(result.passesAttempted).toBeNull(); // Missing stat is NULL
  });

  it('TC-08 to TC-10: unknown and extra statistic types preserved in extendedStatistics JSONB', () => {
    const extraStatLineup: SportmonksLineupDto = {
      id: 108,
      fixture_id: 18535518,
      player_id: 8001,
      team_id: 14,
      details: [
        { code: 'big-chances-created', value: 3 },
        { code: 'custom-metric-xyz', value: 'high' },
        { type_id: 999, value: 42 },
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      extraStatLineup,
      sampleFixtureDto,
    );

    expect(result.extendedStatistics?.['big-chances-created']).toBe(3);
    expect(result.extendedStatistics?.['custom-metric-xyz']).toBe('high');
    expect(result.extendedStatistics?.['type_999']).toBe(42);
  });

  it('TC-11: malformed statistic values handled safely without crashing', () => {
    const malformedLineup: SportmonksLineupDto = {
      id: 109,
      fixture_id: 18535518,
      player_id: 9001,
      team_id: 14,
      details: [
        { code: 'goals', value: 'invalid_number' },
        { code: 'assists', value: '' },
        { code: 'shots-total', value: { total: 4 } }, // nested object
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      malformedLineup,
      sampleFixtureDto,
    );

    expect(result.goals).toBeNull();
    expect(result.assists).toBeNull();
    expect(result.shots).toBe(4); // object.total parsed safely
  });

  it('TC-12: deterministic derived-stat calculation (starter and goalkeeper hierarchies)', () => {
    const gk = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      { id: 1, fixture_id: 100, player_id: 10, team_id: 14, position_id: 24, type_id: 11, details: [{ code: 'saves', value: 3 }] },
      sampleFixtureDto,
    );
    expect(gk.saves).toBe(3);

    const starter = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      { id: 2, fixture_id: 100, player_id: 11, team_id: 14, formation_position: 8, details: [] },
      sampleFixtureDto,
    );
    expect(starter.isStarter).toBe(true);

    const bench = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      { id: 3, fixture_id: 100, player_id: 12, team_id: 14, type_id: 12, formation_position: 12, details: [] },
      sampleFixtureDto,
    );
    expect(bench.isStarter).toBe(false);
  });

  it('TC-13: verify no fabricated fields (percentages NOT inverted into fabricated counts)', () => {
    const percentageLineup: SportmonksLineupDto = {
      id: 107,
      fixture_id: 18535518,
      player_id: 7001,
      team_id: 14,
      details: [
        { code: 'passes-total', value: 42 },
        { code: 'pass-accuracy-percentage', value: '88%' },
      ],
    };

    const result = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      percentageLineup,
      sampleFixtureDto,
    );

    expect(result.passesAttempted).toBe(42);
    expect(result.passesCompleted).toBeNull(); // NOT fabricated to 37
    expect(result.extendedStatistics?.['pass-accuracy-percentage']).toBe('88%');
  });

  it('TC-14: verify mapper is pure, side-effect free, and does not mutate input DTO', () => {
    const inputCopy = JSON.parse(JSON.stringify(sampleOutfieldLineup));
    const out1 = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      sampleOutfieldLineup,
      sampleFixtureDto,
    );
    const out2 = SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
      sampleOutfieldLineup,
      sampleFixtureDto,
    );

    expect(out1).toEqual(out2);
    expect(sampleOutfieldLineup).toEqual(inputCopy);
  });
});
