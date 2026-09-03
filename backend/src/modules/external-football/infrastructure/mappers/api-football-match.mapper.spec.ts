import { ApiFootballMatchMapper } from './api-football-match.mapper';
import { ApiFootballFixtureResponseItemDto } from '../dto/api-football-fixture.dto';

describe('ApiFootballMatchMapper', () => {
  const sampleFixture: ApiFootballFixtureResponseItemDto = {
    fixture: {
      id: 1208021,
      referee: 'R. Jones',
      timezone: 'UTC',
      date: '2024-08-16T19:00:00+00:00',
      timestamp: 1723834800,
      periods: { first: 1723834800, second: 1723838400 },
      venue: { id: 556, name: 'Old Trafford', city: 'Manchester' },
      status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
    },
    league: {
      id: 39,
      name: 'Premier League',
      country: 'England',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
      flag: null,
      season: 2024,
      round: 'Regular Season - 1',
    },
    teams: {
      home: { id: 33, name: 'Manchester United', logo: null, winner: true },
      away: { id: 36, name: 'Fulham', logo: null, winner: false },
    },
    goals: { home: 1, away: 0 },
    score: {
      halftime: { home: 0, away: 0 },
      fulltime: { home: 1, away: 0 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };

  it('should correctly map API-Football fixture to TransformedMatch', () => {
    const result = ApiFootballMatchMapper.toTransformedMatch(sampleFixture);

    expect(result.externalProvider).toBe('API_FOOTBALL');
    expect(result.externalId).toBe('1208021');
    expect(result.status).toBe('FINISHED');
    expect(result.matchday).toBe(1);
    expect(result.homeScore).toBe(1);
    expect(result.awayScore).toBe(0);
    expect(result.homeTeamExternalId).toBe('33');
    expect(result.awayTeamExternalId).toBe('36');
    expect(result.competitionExternalId).toBe('39');
    expect(result.seasonExternalId).toBe('2024');
    expect(result.venue).toBe('Old Trafford');
    expect(result.matchDate).toEqual(new Date('2024-08-16T19:00:00+00:00'));
  });

  it('should map various status codes correctly', () => {
    const fixtureWithStatus = (shortStatus: string) => ({
      ...sampleFixture,
      fixture: {
        ...sampleFixture.fixture,
        status: { long: 'Status', short: shortStatus, elapsed: 45 },
      },
    });

    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('NS')).status).toBe('SCHEDULED');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('1H')).status).toBe('IN_PLAY');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('HT')).status).toBe('IN_PLAY');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('2H')).status).toBe('IN_PLAY');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('AET')).status).toBe('FINISHED');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('PEN')).status).toBe('FINISHED');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('PST')).status).toBe('POSTPONED');
    expect(ApiFootballMatchMapper.toTransformedMatch(fixtureWithStatus('CANC')).status).toBe('POSTPONED');
  });

  it('should throw error if fixture id is missing', () => {
    expect(() =>
      ApiFootballMatchMapper.toTransformedMatch({
        ...sampleFixture,
        fixture: { ...sampleFixture.fixture, id: undefined as any },
      }),
    ).toThrow('Invalid API-Football fixture: missing fixture id');
  });
});
