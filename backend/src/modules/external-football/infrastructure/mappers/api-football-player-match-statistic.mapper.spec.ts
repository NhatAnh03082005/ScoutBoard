import { ApiFootballPlayerMatchStatisticMapper } from './api-football-player-match-statistic.mapper';
import { ApiFootballFixturePlayerItemDto } from '../dto/api-football-fixture-player.dto';

describe('ApiFootballPlayerMatchStatisticMapper', () => {
  const outfieldDto: ApiFootballFixturePlayerItemDto = {
    player: {
      id: 545,
      name: 'Noussair Mazraoui',
      photo: 'https://media.api-sports.io/football/players/545.png',
    },
    statistics: [
      {
        games: {
          minutes: 81,
          number: 3,
          position: 'D',
          rating: '7.5',
          captain: false,
          substitute: false,
        },
        offsides: null,
        shots: { total: 1, on: 1 },
        goals: { total: 0, conceded: 0, assists: 1, saves: null },
        passes: { total: 38, key: 2, accuracy: '35' },
        tackles: { total: 2, blocks: 1, interceptions: 3 },
        duels: { total: 7, won: 6 },
        dribbles: { attempts: 2, success: 1, past: null },
        fouls: { drawn: 1, committed: 0 },
        cards: { yellow: 0, red: 0 },
        penalty: {
          won: null,
          commited: null,
          scored: 0,
          missed: 0,
          saved: null,
        },
      },
    ],
  };

  const goalkeeperDto: ApiFootballFixturePlayerItemDto = {
    player: {
      id: 526,
      name: 'André Onana',
      photo: 'https://media.api-sports.io/football/players/526.png',
    },
    statistics: [
      {
        games: {
          minutes: 90,
          number: 24,
          position: 'G',
          rating: '7.2',
          captain: false,
          substitute: false,
        },
        offsides: null,
        shots: { total: null, on: null },
        goals: { total: 0, conceded: 0, assists: 0, saves: 2 },
        passes: { total: 23, key: null, accuracy: '16' },
        tackles: { total: null, blocks: null, interceptions: null },
        duels: { total: null, won: null },
        dribbles: { attempts: null, success: null, past: null },
        fouls: { drawn: null, committed: null },
        cards: { yellow: 0, red: 0 },
        penalty: { won: null, commited: null, scored: 0, missed: 0, saved: 1 },
      },
    ],
  };

  it('should correctly map outfield player statistics with null goalkeeper metrics', () => {
    const result = ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
      outfieldDto,
      '33',
      '1208021',
    );

    expect(result.externalProvider).toBe('API_FOOTBALL');
    expect(result.playerExternalId).toBe('545');
    expect(result.teamExternalId).toBe('33');
    expect(result.matchExternalId).toBe('1208021');
    expect(result.isStarter).toBe(true);
    expect(result.minutesPlayed).toBe(81);
    expect(result.rating).toBe(7.5);
    expect(result.goals).toBe(0);
    expect(result.assists).toBe(1);
    expect(result.shots).toBe(1);
    expect(result.shotsOnTarget).toBe(1);
    expect(result.passesAttempted).toBe(38);
    expect(result.passesCompleted).toBe(35);
    expect(result.keyPasses).toBe(2);
    expect(result.tackles).toBe(2);
    expect(result.interceptions).toBe(3);
    expect(result.duelsWon).toBe(6);

    // GK metrics must be strictly null for outfield players
    expect(result.saves).toBeNull();
    expect(result.goalsConceded).toBeNull();
    expect(result.cleanSheets).toBeNull();
    expect(result.penaltiesSaved).toBeNull();
  });

  it('should correctly map Goalkeeper statistics including clean sheets and saves', () => {
    const result = ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
      goalkeeperDto,
      '33',
      '1208021',
    );

    expect(result.playerExternalId).toBe('526');
    expect(result.minutesPlayed).toBe(90);
    expect(result.rating).toBe(7.2);
    expect(result.saves).toBe(2);
    expect(result.goalsConceded).toBe(0);
    expect(result.cleanSheets).toBe(1);
    expect(result.penaltiesSaved).toBe(1);
  });

  it('should correctly calculate cleanSheet = 0 if GK conceded goals', () => {
    const gkWithConceded: ApiFootballFixturePlayerItemDto = {
      ...goalkeeperDto,
      statistics: [
        {
          ...goalkeeperDto.statistics[0],
          goals: { total: 0, conceded: 2, assists: 0, saves: 4 },
        },
      ],
    };

    const result = ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
      gkWithConceded,
      '33',
      '1208021',
    );

    expect(result.saves).toBe(4);
    expect(result.goalsConceded).toBe(2);
    expect(result.cleanSheets).toBe(0);
  });

  it('should throw error if player id is missing', () => {
    expect(() =>
      ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
        { player: {} as any, statistics: [] },
        '33',
        '1208021',
      ),
    ).toThrow('Invalid fixture player: missing player id');
  });
});
