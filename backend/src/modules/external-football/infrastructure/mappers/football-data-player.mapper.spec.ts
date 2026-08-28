import { FootballDataPlayerMapper } from './football-data-player.mapper';
import {
  ExternalPlayerDto,
  ExternalPlayerDetailDto,
  ExternalPlayerListDto,
} from '../dto/external-player.dto';

describe('FootballDataPlayerMapper', () => {
  const samplePlayerDto: ExternalPlayerDto = {
    id: 44,
    name: 'Cristiano Ronaldo',
    firstName: 'Cristiano',
    lastName: 'Ronaldo',
    dateOfBirth: '1985-02-05',
    nationality: 'Portugal',
    section: 'Offence',
    position: 'Centre-Forward',
    shirtNumber: 7,
    lastUpdated: '2024-05-15T12:00:00Z',
  };

  it('should map standard ExternalPlayerDto correctly', () => {
    const transformed = FootballDataPlayerMapper.toTransformedPlayer(samplePlayerDto);

    expect(transformed.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(transformed.externalId).toBe('44');
    expect(transformed.name).toBe('Cristiano Ronaldo');
    expect(transformed.normalizedName).toBe('cristiano ronaldo');
    expect(transformed.shortName).toBe('Ronaldo');
    expect(transformed.dateOfBirth).toBe('1985-02-05');
    expect(transformed.nationality).toBe('Portugal');
    expect(transformed.primaryPosition).toBe('Centre-Forward');
    expect(transformed.shirtNumber).toBe(7);
    expect(transformed.status).toBe('ACTIVE');
    expect(transformed.dataUpdatedAt).toEqual(new Date('2024-05-15T12:00:00Z'));
  });

  it('should extract currentTeam external ID from ExternalPlayerDetailDto', () => {
    const detailDto: ExternalPlayerDetailDto = {
      ...samplePlayerDto,
      currentTeam: {
        id: 66,
        name: 'Manchester United FC',
        shortName: 'Man United',
        tla: 'MUN',
        crest: 'https://crests.football-data.org/66.png',
      },
    };

    const transformed = FootballDataPlayerMapper.toTransformedPlayer(detailDto);

    expect(transformed.currentTeamExternalId).toBe('66');
  });

  it('should use section if position is missing', () => {
    const dtoWithoutPosition: ExternalPlayerDto = {
      id: 50,
      name: 'Midfield Player',
      position: null,
      section: 'Midfield',
    };

    const transformed = FootballDataPlayerMapper.toTransformedPlayer(dtoWithoutPosition);

    expect(transformed.primaryPosition).toBe('Midfield');
  });

  it('should normalize names with accents and diacritics', () => {
    const dtoWithAccents: ExternalPlayerDto = {
      id: 99,
      name: 'Éder Militão',
      position: 'Defence',
    };

    const transformed = FootballDataPlayerMapper.toTransformedPlayer(dtoWithAccents);

    expect(transformed.name).toBe('Éder Militão');
    expect(transformed.normalizedName).toBe('eder militao');
  });

  it('should throw error when id is missing', () => {
    expect(() =>
      FootballDataPlayerMapper.toTransformedPlayer({
        id: null as any,
        name: 'Invalid Player',
      }),
    ).toThrow('Cannot map invalid or empty player DTO');
  });

  it('should throw error when name is empty', () => {
    expect(() =>
      FootballDataPlayerMapper.toTransformedPlayer({
        id: 123,
        name: '   ',
      }),
    ).toThrow('Player name is required');
  });

  it('should map list and deduplicate by externalId', () => {
    const listDto: ExternalPlayerListDto = {
      count: 3,
      players: [
        samplePlayerDto,
        {
          id: 44, // duplicate
          name: 'Cristiano Ronaldo Duplicate',
        },
        {
          id: 45,
          name: 'Bruno Fernandes',
          position: 'Attacking Midfield',
        },
      ],
    };

    const result = FootballDataPlayerMapper.toTransformedPlayerList(listDto, 'FOOTBALL_DATA_ORG', '66');

    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe('44');
    expect(result[0].currentTeamExternalId).toBe('66');
    expect(result[1].externalId).toBe('45');
    expect(result[1].currentTeamExternalId).toBe('66');
  });

  it('should handle empty or undefined list gracefully', () => {
    expect(FootballDataPlayerMapper.toTransformedPlayerList(null as any)).toEqual([]);
    expect(
      FootballDataPlayerMapper.toTransformedPlayerList({ count: 0, players: [] }),
    ).toEqual([]);
  });
});
