import { ApiFootballTeamMapper } from './api-football-team.mapper';
import { ApiFootballTeamResponseItemDto } from '../dto/api-football-team.dto';

describe('ApiFootballTeamMapper', () => {
  const sampleDto: ApiFootballTeamResponseItemDto = {
    team: {
      id: 33,
      name: 'Manchester United',
      code: 'MUN',
      country: 'England',
      founded: 1878,
      national: false,
      logo: 'https://media.api-sports.io/football/teams/33.png',
    },
    venue: {
      id: 556,
      name: 'Old Trafford',
      address: 'Sir Matt Busby Way',
      city: 'Manchester',
      capacity: 76212,
      surface: 'grass',
      image: 'https://media.api-sports.io/football/venues/556.png',
    },
  };

  it('should correctly map API-Football team to TransformedTeam', () => {
    const result = ApiFootballTeamMapper.toTransformedTeam(sampleDto);

    expect(result.externalProvider).toBe('API_FOOTBALL');
    expect(result.externalId).toBe('33');
    expect(result.name).toBe('Manchester United');
    expect(result.shortName).toBe('MUN');
    expect(result.tla).toBe('MUN');
    expect(result.country).toBe('England');
    expect(result.foundedYear).toBe(1878);
    expect(result.venueName).toBe('Old Trafford');
    expect(result.logoUrl).toBe('https://media.api-sports.io/football/teams/33.png');
    expect(result.status).toBe('ACTIVE');
    expect(result.squad).toEqual([]);
  });

  it('should throw error if team id or name is missing', () => {
    expect(() =>
      ApiFootballTeamMapper.toTransformedTeam({
        team: {} as any,
        venue: {} as any,
      }),
    ).toThrow('Invalid API-Football team item');
  });
});
