import { ApiFootballCompetitionMapper } from './api-football-competition.mapper';
import { ApiFootballLeagueResponseItemDto } from '../dto/api-football-league.dto';

describe('ApiFootballCompetitionMapper', () => {
  const sampleDto: ApiFootballLeagueResponseItemDto = {
    league: {
      id: 39,
      name: 'Premier League',
      type: 'League',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
    },
    country: {
      name: 'England',
      code: 'GB-ENG',
      flag: 'https://media.api-sports.io/flags/gb-eng.svg',
    },
    seasons: [
      {
        year: 2024,
        start: '2024-08-16',
        end: '2025-05-25',
        current: false,
      },
      {
        year: 2025,
        start: '2025-08-15',
        end: '2026-05-24',
        current: true,
      },
    ],
  };

  it('should correctly map API-Football league to TransformedCompetition', () => {
    const result = ApiFootballCompetitionMapper.toTransformedCompetition(sampleDto);

    expect(result.externalProvider).toBe('API_FOOTBALL');
    expect(result.externalId).toBe('39');
    expect(result.name).toBe('Premier League');
    expect(result.country).toBe('England');
    expect(result.code).toBe('GB-ENG');
    expect(result.type).toBe('LEAGUE');
    expect(result.logoUrl).toBe('https://media.api-sports.io/football/leagues/39.png');
    expect(result.seasons).toHaveLength(2);
    expect(result.seasons[0].externalId).toBe('2024');
    expect(result.seasons[0].seasonCode).toBe('2024-2025');
    expect(result.seasons[0].isCurrent).toBe(false);
    expect(result.seasons[1].externalId).toBe('2025');
    expect(result.seasons[1].isCurrent).toBe(true);
    expect(result.currentSeason?.externalId).toBe('2025');
  });

  it('should throw error if league id or name is missing', () => {
    expect(() =>
      ApiFootballCompetitionMapper.toTransformedCompetition({
        league: {} as any,
        country: {} as any,
        seasons: [],
      }),
    ).toThrow('Invalid API-Football league item');
  });
});
