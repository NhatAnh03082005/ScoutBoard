import { FootballDataMatchMapper } from './football-data-match.mapper';
import {
  ExternalMatchDto,
  ExternalMatchDetailDto,
  ExternalMatchListDto,
} from '../dto/external-match.dto';

describe('FootballDataMatchMapper', () => {
  const sampleMatchDto: ExternalMatchDto = {
    id: 327117,
    utcDate: '2026-08-22T19:00:00Z',
    status: 'FINISHED',
    matchday: 1,
    homeTeam: {
      id: 66,
      name: 'Manchester United FC',
      shortName: 'Man United',
      tla: 'MUN',
    },
    awayTeam: {
      id: 65,
      name: 'Manchester City FC',
      shortName: 'Man City',
      tla: 'MCI',
    },
    score: {
      winner: 'HOME_TEAM',
      fullTime: {
        home: 2,
        away: 1,
      },
    },
    lastUpdated: '2026-08-22T21:00:00Z',
  };

  it('TC-01 & TC-04 & TC-05 & TC-06 & TC-08: should map full match response correctly preserving UTC date and scores', () => {
    const transformed = FootballDataMatchMapper.toTransformedMatch(sampleMatchDto);

    expect(transformed.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(transformed.externalId).toBe('327117');
    expect(transformed.matchDate).toEqual(new Date('2026-08-22T19:00:00Z'));
    expect(transformed.status).toBe('FINISHED');
    expect(transformed.homeScore).toBe(2);
    expect(transformed.awayScore).toBe(1);
    expect(transformed.homeTeamExternalId).toBe('66');
    expect(transformed.awayTeamExternalId).toBe('65');
    expect(transformed.matchday).toBe(1);
    expect(transformed.dataUpdatedAt).toEqual(new Date('2026-08-22T21:00:00Z'));
  });

  it('TC-02 & TC-03: should extract competition and season external IDs from detail DTO', () => {
    const detailDto: ExternalMatchDetailDto = {
      ...sampleMatchDto,
      competition: {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
      },
      season: {
        id: 2502,
        startDate: '2026-08-21',
        endDate: '2027-05-30',
      },
    };

    const transformed = FootballDataMatchMapper.toTransformedMatch(detailDto);

    expect(transformed.competitionExternalId).toBe('2021');
    expect(transformed.seasonExternalId).toBe('2502');
  });

  it('TC-07: should handle SCHEDULED matches with null scores', () => {
    const scheduledDto: ExternalMatchDto = {
      id: 327118,
      utcDate: '2026-09-01T15:00:00Z',
      status: 'SCHEDULED',
      homeTeam: { id: 66, name: 'Man United' },
      awayTeam: { id: 57, name: 'Arsenal FC' },
      score: null,
    };

    const transformed = FootballDataMatchMapper.toTransformedMatch(scheduledDto);

    expect(transformed.status).toBe('SCHEDULED');
    expect(transformed.homeScore).toBeNull();
    expect(transformed.awayScore).toBeNull();
  });

  it('TC-09: should normalize various match statuses correctly', () => {
    const statuses = [
      'IN_PLAY',
      'PAUSED',
      'POSTPONED',
      'SUSPENDED',
      'CANCELLED',
      'AWARDED',
      'TIMED',
      'FINISHED',
    ];

    for (const status of statuses) {
      const match: ExternalMatchDto = {
        ...sampleMatchDto,
        status,
      };
      const transformed = FootballDataMatchMapper.toTransformedMatch(match);
      expect(transformed.status).toBe(status);
    }

    // Unknown status fallback
    const unknownMatch: ExternalMatchDto = {
      ...sampleMatchDto,
      status: 'SOME_UNKNOWN_STATUS',
    };
    expect(FootballDataMatchMapper.toTransformedMatch(unknownMatch).status).toBe(
      'SCHEDULED',
    );
  });

  it('TC-10 & TC-11: should map matchday and set venue to null when missing', () => {
    const transformed = FootballDataMatchMapper.toTransformedMatch(sampleMatchDto);
    expect(transformed.matchday).toBe(1);
    expect(transformed.venue).toBeNull();
  });

  it('TC-12: should map cancelled match preserving CANCELLED status and null scores', () => {
    const cancelledDto: ExternalMatchDto = {
      id: 327119,
      utcDate: '2026-09-05T15:00:00Z',
      status: 'CANCELLED',
      homeTeam: { id: 66, name: 'Man United' },
      awayTeam: { id: 61, name: 'Chelsea FC' },
      score: { fullTime: { home: null, away: null } },
    };

    const transformed = FootballDataMatchMapper.toTransformedMatch(cancelledDto);
    expect(transformed.status).toBe('CANCELLED');
    expect(transformed.homeScore).toBeNull();
    expect(transformed.awayScore).toBeNull();
  });

  it('TC-13 & TC-14: should handle null competition and null season gracefully', () => {
    const matchWithoutComp: ExternalMatchDetailDto = {
      ...sampleMatchDto,
      competition: undefined,
      season: undefined,
    };

    const transformed = FootballDataMatchMapper.toTransformedMatch(matchWithoutComp);
    expect(transformed.competitionExternalId).toBeNull();
    expect(transformed.seasonExternalId).toBeNull();
  });

  it('TC-15: should throw error when match ID is missing or invalid', () => {
    expect(() =>
      FootballDataMatchMapper.toTransformedMatch({
        id: null as any,
        homeTeam: { id: 1, name: 'A' },
        awayTeam: { id: 2, name: 'B' },
      } as any),
    ).toThrow('Cannot map invalid or empty match DTO');

    expect(() =>
      FootballDataMatchMapper.toTransformedMatch({
        id: '' as any,
        homeTeam: { id: 1, name: 'A' },
        awayTeam: { id: 2, name: 'B' },
      } as any),
    ).toThrow('Cannot map invalid or empty match ID');
  });

  it('TC-16 & TC-17: should handle invalid dates without producing NaN', () => {
    const matchInvalidDate: ExternalMatchDto = {
      ...sampleMatchDto,
      utcDate: 'invalid-date-string',
      lastUpdated: 'invalid-date-string',
    };

    const transformed = FootballDataMatchMapper.toTransformedMatch(matchInvalidDate);
    expect(transformed.matchDate).toBeNull();
    expect(transformed.dataUpdatedAt).toBeNull();
  });

  it('TC-18: should be deterministic (same input produces identical output)', () => {
    const out1 = FootballDataMatchMapper.toTransformedMatch(sampleMatchDto);
    const out2 = FootballDataMatchMapper.toTransformedMatch(sampleMatchDto);
    expect(out1).toEqual(out2);
  });

  it('TC-19: should throw error when home team and away team are the same', () => {
    expect(() =>
      FootballDataMatchMapper.toTransformedMatch({
        id: 123,
        homeTeam: { id: 66, name: 'Man United' },
        awayTeam: { id: 66, name: 'Man United' },
      } as any),
    ).toThrow('Match home team and away team cannot be the same');
  });

  it('TC-20: should map match list and deduplicate by externalId', () => {
    const listDto: ExternalMatchListDto = {
      count: 3,
      matches: [
        sampleMatchDto,
        { ...sampleMatchDto, id: 327117 }, // duplicate
        {
          id: 327119,
          utcDate: '2026-08-23T15:00:00Z',
          status: 'FINISHED',
          homeTeam: { id: 61, name: 'Chelsea FC' },
          awayTeam: { id: 64, name: 'Liverpool FC' },
          score: { fullTime: { home: 1, away: 1 } },
        },
      ],
    };

    const result = FootballDataMatchMapper.toTransformedMatchList(listDto);

    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe('327117');
    expect(result[1].externalId).toBe('327119');
  });
});
