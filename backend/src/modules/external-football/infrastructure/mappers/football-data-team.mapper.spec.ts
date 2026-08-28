import { FootballDataTeamMapper } from './football-data-team.mapper';
import {
  ExternalTeamDto,
  ExternalTeamDetailDto,
  ExternalTeamListDto,
} from '../dto/external-team.dto';

describe('FootballDataTeamMapper', () => {
  const sampleTeamDto: ExternalTeamDto = {
    id: 66,
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    crest: 'https://crests.football-data.org/66.png',
    founded: 1878,
    venue: 'Old Trafford',
  };

  it('should map standard ExternalTeamDto correctly', () => {
    const transformed = FootballDataTeamMapper.toTransformedTeam(sampleTeamDto);

    expect(transformed.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(transformed.externalId).toBe('66');
    expect(transformed.name).toBe('Manchester United FC');
    expect(transformed.shortName).toBe('Man United');
    expect(transformed.tla).toBe('MUN');
    expect(transformed.foundedYear).toBe(1878);
    expect(transformed.venueName).toBe('Old Trafford');
    expect(transformed.logoUrl).toBe('https://crests.football-data.org/66.png');
    expect(transformed.status).toBe('ACTIVE');
    expect(transformed.squad).toEqual([]);
  });

  it('should map squad players within ExternalTeamDetailDto', () => {
    const detailDto: ExternalTeamDetailDto = {
      ...sampleTeamDto,
      squad: [
        {
          id: 44,
          name: 'Cristiano Ronaldo',
          position: 'Centre-Forward',
          shirtNumber: 7,
        },
        {
          id: 45,
          name: 'Bruno Fernandes',
          position: 'Attacking Midfield',
          shirtNumber: 8,
        },
      ],
    };

    const transformed = FootballDataTeamMapper.toTransformedTeam(detailDto);

    expect(transformed.squad).toHaveLength(2);
    expect(transformed.squad[0].externalId).toBe('44');
    expect(transformed.squad[0].currentTeamExternalId).toBe('66');
    expect(transformed.squad[1].externalId).toBe('45');
    expect(transformed.squad[1].currentTeamExternalId).toBe('66');
  });

  it('should deduplicate squad players by externalId', () => {
    const detailDto: ExternalTeamDetailDto = {
      ...sampleTeamDto,
      squad: [
        { id: 44, name: 'Player 1' },
        { id: 44, name: 'Player 1 duplicate' },
      ],
    };

    const transformed = FootballDataTeamMapper.toTransformedTeam(detailDto);

    expect(transformed.squad).toHaveLength(1);
    expect(transformed.squad[0].name).toBe('Player 1');
  });

  it('should throw when team id is missing', () => {
    expect(() =>
      FootballDataTeamMapper.toTransformedTeam({
        id: null as any,
        name: 'Invalid Team',
      }),
    ).toThrow('Cannot map invalid or empty team DTO');
  });

  it('should throw when team name is empty', () => {
    expect(() =>
      FootballDataTeamMapper.toTransformedTeam({
        id: 123,
        name: '  ',
      }),
    ).toThrow('Team name is required');
  });

  it('should map list and deduplicate by externalId', () => {
    const listDto: ExternalTeamListDto = {
      count: 3,
      teams: [
        sampleTeamDto,
        { id: 66, name: 'Man Utd duplicate' },
        { id: 65, name: 'Manchester City FC', shortName: 'Man City', tla: 'MCI' },
      ],
    };

    const result = FootballDataTeamMapper.toTransformedTeamList(listDto);

    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe('66');
    expect(result[1].externalId).toBe('65');
  });
});
