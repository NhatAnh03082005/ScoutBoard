import { FootballDataPlayerTeamHistoryMapper } from './football-data-player-team-history.mapper';
import {
  PlayerPersonDetailInput,
  PlayerMatchAppearanceInput,
} from '../../domain/models/transformed-player-team-history.model';

describe('FootballDataPlayerTeamHistoryMapper', () => {
  const mockPlayerDetail: PlayerPersonDetailInput = {
    playerExternalId: '44',
    currentTeamExternalId: '66',
    currentTeamContractStart: '2021-08-01',
    shirtNumber: 7,
  };

  it('TC-01: should derive timeline for a player with matches in one historical team', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2015-09-12' },
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2018-05-26' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      playerExternalId: '44',
      teamExternalId: '86',
      externalProvider: 'FOOTBALL_DATA_ORG',
      firstObservedYear: 2015,
      lastObservedYear: 2018,
      startDate: '2015-01-01',
      endDate: '2018-12-31',
      shirtNumber: null,
      isCurrent: false,
    });
  });

  it('TC-02, TC-03, TC-04: should derive multiple teams timeline with current team having isCurrent=true and leftYear=null', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2015-01-01' },
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2018-05-01' },
      { playerExternalId: '44', teamExternalId: '109', matchUtcDate: '2018-08-10' },
      { playerExternalId: '44', teamExternalId: '109', matchUtcDate: '2021-05-15' },
      { playerExternalId: '44', teamExternalId: '66', matchUtcDate: '2021-09-01' },
      { playerExternalId: '44', teamExternalId: '66', matchUtcDate: '2022-11-20' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      mockPlayerDetail,
      appearances,
    );

    expect(result).toHaveLength(3);

    // Team 86 (Real Madrid) - Historical
    const team86 = result.find((r) => r.teamExternalId === '86')!;
    expect(team86.isCurrent).toBe(false);
    expect(team86.firstObservedYear).toBe(2015);
    expect(team86.lastObservedYear).toBe(2018);
    expect(team86.endDate).toBe('2018-12-31');

    // Team 109 (Juventus) - Historical
    const team109 = result.find((r) => r.teamExternalId === '109')!;
    expect(team109.isCurrent).toBe(false);
    expect(team109.firstObservedYear).toBe(2018);
    expect(team109.lastObservedYear).toBe(2021);
    expect(team109.endDate).toBe('2021-12-31');

    // Team 66 (Man United) - Current
    const team66 = result.find((r) => r.teamExternalId === '66')!;
    expect(team66.isCurrent).toBe(true);
    expect(team66.firstObservedYear).toBe(2021);
    expect(team66.lastObservedYear).toBeNull();
    expect(team66.endDate).toBeNull();
    expect(team66.shirtNumber).toBe(7);
  });

  it('TC-05: should exclude opponent teams (only add team player represented)', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2017-04-23' }, // RMA vs BAR (only RMA added)
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(1);
    expect(result[0].teamExternalId).toBe('86');
  });

  it('TC-06: should ignore matches where player did not participate or has different playerExternalId', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '999', teamExternalId: '86', matchUtcDate: '2017-04-23' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(0);
  });

  it('TC-07: should correctly extract year from ISO date string', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2024-08-17T14:30:00Z' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result[0].firstObservedYear).toBe(2024);
    expect(result[0].lastObservedYear).toBe(2024);
  });

  it('TC-08: should aggregate 10 matches for the same team into 1 history entry with min and max years', () => {
    const appearances: PlayerMatchAppearanceInput[] = Array.from({ length: 10 }, (_, i) => ({
      playerExternalId: '44',
      teamExternalId: '86',
      matchUtcDate: `201${i % 9}-05-10`,
    }));

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(1);
    expect(result[0].firstObservedYear).toBe(2010);
    expect(result[0].lastObservedYear).toBe(2018);
  });

  it('TC-09: should handle multiple matches in the same year with joinedYear = leftYear', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2020-01-10' },
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2020-05-15' },
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2020-11-20' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(1);
    expect(result[0].firstObservedYear).toBe(2020);
    expect(result[0].lastObservedYear).toBe(2020);
  });

  it('TC-10: should safely handle missing or invalid match date', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: null },
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: 'invalid-date' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(1);
    expect(result[0].firstObservedYear).toBeNull();
    expect(result[0].lastObservedYear).toBeNull();
  });

  it('TC-11: should skip appearance when teamExternalId is missing or empty', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '', matchUtcDate: '2020-01-10' },
      { playerExternalId: '44', teamExternalId: null as any, matchUtcDate: '2020-01-10' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result).toHaveLength(0);
  });

  it('TC-12: should set shirtNumber to null when not provided in match or current team', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2015-01-10', shirtNumber: null },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null, shirtNumber: null },
      appearances,
    );

    expect(result[0].shirtNumber).toBeNull();
  });

  it('TC-13: should not claim fake exact transfer dates and use observed playing years', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2016-03-10' },
    ];

    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      { playerExternalId: '44', currentTeamExternalId: null },
      appearances,
    );

    expect(result[0].firstObservedYear).toBe(2016);
    expect(result[0].lastObservedYear).toBe(2016);
    expect(result[0].startDate).toBe('2016-01-01');
    expect(result[0].endDate).toBe('2016-12-31');
  });

  it('TC-14: should handle current team even when player has 0 match appearances yet', () => {
    const result = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      mockPlayerDetail,
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].teamExternalId).toBe('66');
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].firstObservedYear).toBe(2021);
    expect(result[0].startDate).toBe('2021-08-01');
    expect(result[0].endDate).toBeNull();
  });

  it('TC-15: should be deterministic (same input produces identical output)', () => {
    const appearances: PlayerMatchAppearanceInput[] = [
      { playerExternalId: '44', teamExternalId: '86', matchUtcDate: '2015-05-10' },
      { playerExternalId: '44', teamExternalId: '109', matchUtcDate: '2019-08-20' },
    ];

    const out1 = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      mockPlayerDetail,
      appearances,
    );
    const out2 = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      mockPlayerDetail,
      appearances,
    );

    expect(out1).toEqual(out2);
  });
});
