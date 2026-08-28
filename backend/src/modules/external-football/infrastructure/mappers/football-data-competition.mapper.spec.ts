import {
  FootballDataCompetitionMapper,
  FOOTBALL_DATA_ORG_PROVIDER,
} from './football-data-competition.mapper';
import {
  ExternalCompetitionDto,
  ExternalCompetitionDetailDto,
  ExternalCompetitionListDto,
} from '../dto/external-competition.dto';
import { ExternalFootballInvalidResponseError } from '../../domain/errors/external-football.errors';

describe('FootballDataCompetitionMapper', () => {
  const fullMockCompetition: ExternalCompetitionDetailDto = {
    id: 2021,
    name: 'Premier League',
    code: 'PL',
    type: 'LEAGUE',
    emblem: 'https://crests.football-data.org/PL.png',
    area: {
      id: 2072,
      name: 'England',
      code: 'ENG',
      flag: 'https://crests.football-data.org/770.svg',
    },
    currentSeason: {
      id: 1564,
      startDate: '2024-08-16',
      endDate: '2025-05-25',
      currentMatchday: 38,
      winner: null,
    },
    seasons: [
      {
        id: 1564,
        startDate: '2024-08-16',
        endDate: '2025-05-25',
        currentMatchday: 38,
        winner: null,
      },
      {
        id: 2023,
        startDate: '2023-08-11',
        endDate: '2024-05-19',
        currentMatchday: 38,
        winner: {
          id: 65,
          name: 'Manchester City FC',
        },
      },
    ],
    lastUpdated: '2024-05-20T12:00:00Z',
  };

  // TC-01: Full Response
  it('TC-01: Full Response - should map all fields directly and accurately', () => {
    const result = FootballDataCompetitionMapper.toTransformedCompetition(fullMockCompetition);

    expect(result).toBeDefined();
    expect(result.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(result.externalId).toBe('2021');
    expect(result.name).toBe('Premier League');
    expect(result.code).toBe('PL');
    expect(result.country).toBe('England');
    expect(result.type).toBe('LEAGUE');
    expect(result.logoUrl).toBe('https://crests.football-data.org/PL.png');
    expect(result.dataUpdatedAt).toEqual(new Date('2024-05-20T12:00:00Z'));

    expect(result.currentSeason).toBeDefined();
    expect(result.currentSeason?.externalId).toBe('1564');
    expect(result.currentSeason?.seasonCode).toBe('2024-2025');
    expect(result.currentSeason?.isCurrent).toBe(true);

    expect(result.seasons).toHaveLength(2);
    expect(result.seasons[0].externalId).toBe('1564');
    expect(result.seasons[0].isCurrent).toBe(true);
    expect(result.seasons[1].externalId).toBe('2023');
    expect(result.seasons[1].isCurrent).toBe(false);
  });

  // TC-02: Nullable Code
  it('TC-02: Nullable Code - should map missing or null code to null', () => {
    const mockWithoutCode: ExternalCompetitionDto = {
      id: 2000,
      name: 'FIFA Club World Cup',
      code: '',
      type: 'CUP',
      area: { id: 1, name: 'World', code: 'WLD' },
    };

    const result = FootballDataCompetitionMapper.toTransformedCompetition(mockWithoutCode);
    expect(result.code).toBeNull();
  });

  // TC-03: Missing Area
  it('TC-03: Missing Area - should map missing area or area name to null', () => {
    const mockWithoutArea = {
      id: 2001,
      name: 'UEFA Champions League',
      code: 'CL',
      type: 'CUP',
      area: undefined as any,
    };

    const result1 = FootballDataCompetitionMapper.toTransformedCompetition(mockWithoutArea);
    expect(result1.country).toBeNull();

    const mockWithNullAreaName = {
      id: 2001,
      name: 'UEFA Champions League',
      code: 'CL',
      type: 'CUP',
      area: { id: 2, name: null as any, code: 'EUR' },
    };

    const result2 = FootballDataCompetitionMapper.toTransformedCompetition(mockWithNullAreaName);
    expect(result2.country).toBeNull();
  });

  // TC-04: Missing ID / Missing Name Rejection
  it('TC-04: Missing ID - should throw ExternalFootballInvalidResponseError when id or name is missing', () => {
    expect(() => {
      FootballDataCompetitionMapper.toTransformedCompetition({
        id: null as any,
        name: 'Invalid League',
      } as any);
    }).toThrow(ExternalFootballInvalidResponseError);

    expect(() => {
      FootballDataCompetitionMapper.toTransformedCompetition({
        id: 2021,
        name: '',
      } as any);
    }).toThrow(ExternalFootballInvalidResponseError);

    expect(() => {
      FootballDataCompetitionMapper.toTransformedCompetition(null);
    }).toThrow(ExternalFootballInvalidResponseError);
  });

  // TC-05: Numeric External ID
  it('TC-05: Numeric External ID - should cleanly convert numeric ID to string', () => {
    const result = FootballDataCompetitionMapper.toTransformedCompetition({
      id: 2021,
      name: 'Premier League',
    } as any);

    expect(result.externalId).toBe('2021');
    expect(typeof result.externalId).toBe('string');
  });

  // TC-06: Provider Identity
  it('TC-06: Provider Identity - should set constant FOOTBALL_DATA_ORG', () => {
    const result = FootballDataCompetitionMapper.toTransformedCompetition(fullMockCompetition);
    expect(result.externalProvider).toBe(FOOTBALL_DATA_ORG_PROVIDER);
  });

  // TC-07: No Database Access
  it('TC-07: No Database Access - mapper must be synchronous and pure without database connection', () => {
    const isAsync = (FootballDataCompetitionMapper.toTransformedCompetition as any).constructor.name === 'AsyncFunction';
    expect(isAsync).toBe(false);
  });

  // TC-08: No HTTP Access
  it('TC-08: No HTTP Access - mapper must execute purely in-memory with zero network requests', () => {
    const spyFetch = jest.spyOn(global, 'fetch');
    FootballDataCompetitionMapper.toTransformedCompetition(fullMockCompetition);
    expect(spyFetch).not.toHaveBeenCalled();
    spyFetch.mockRestore();
  });

  // TC-09: Deterministic
  it('TC-09: Deterministic - same input must always produce identical output', () => {
    const result1 = FootballDataCompetitionMapper.toTransformedCompetition(fullMockCompetition);
    const result2 = FootballDataCompetitionMapper.toTransformedCompetition(fullMockCompetition);

    expect(result1).toEqual(result2);
  });

  // TC-10: No Undefined Leakage
  it('TC-10: No Undefined Leakage - output object and JSON serialization should not contain "undefined" or NaN', () => {
    const result = FootballDataCompetitionMapper.toTransformedCompetition({
      id: 2014,
      name: 'La Liga',
      code: 'PD',
      type: 'LEAGUE',
      emblem: null,
      area: null as any,
      lastUpdated: 'invalid-date-string',
      currentSeason: null,
    } as any);

    expect(result.country).toBeNull();
    expect(result.logoUrl).toBeNull();
    expect(result.dataUpdatedAt).toBeNull();
    expect(result.currentSeason).toBeNull();
    expect(result.seasons).toEqual([]);

    const jsonString = JSON.stringify(result);
    expect(jsonString).not.toContain('"undefined"');
    expect(jsonString).not.toContain('NaN');
  });

  // Dedicated Season Transform Review Suite (TC-01 through TC-12)
  describe('Season Transform Review Suite', () => {
    // TC-01: Map current season
    it('TC-01: should map current season with isCurrent = true', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason(
        {
          id: 2502,
          startDate: '2026-08-21',
          endDate: '2027-05-30',
          currentMatchday: 1,
        },
        true,
        'Premier League',
      );

      expect(season).toBeDefined();
      expect(season?.externalId).toBe('2502');
      expect(season?.isCurrent).toBe(true);
      expect(season?.externalProvider).toBe('FOOTBALL_DATA_ORG');
    });

    // TC-02: Map historical season
    it('TC-02: should map historical season with isCurrent = false', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason(
        {
          id: 2403,
          startDate: '2025-08-15',
          endDate: '2026-05-24',
          currentMatchday: 38,
        },
        false,
        'Premier League',
      );

      expect(season).toBeDefined();
      expect(season?.externalId).toBe('2403');
      expect(season?.isCurrent).toBe(false);
    });

    // TC-03: Current season exists in seasons[] -> exactly one transformed season with isCurrent = true
    it('TC-03: should mark the matching season in seasons[] as current without duplicating', () => {
      const competitionPayload: ExternalCompetitionDetailDto = {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
        type: 'LEAGUE',
        area: { id: 2072, name: 'England', code: 'ENG' },
        currentSeason: {
          id: 2502,
          startDate: '2026-08-21',
          endDate: '2027-05-30',
        },
        seasons: [
          {
            id: 2502,
            startDate: '2026-08-21',
            endDate: '2027-05-30',
          },
          {
            id: 2403,
            startDate: '2025-08-15',
            endDate: '2026-05-24',
          },
        ],
      };

      const result = FootballDataCompetitionMapper.toTransformedCompetition(competitionPayload);
      expect(result.seasons).toHaveLength(2);
      expect(result.seasons[0].externalId).toBe('2502');
      expect(result.seasons[0].isCurrent).toBe(true);
      expect(result.seasons[1].externalId).toBe('2403');
      expect(result.seasons[1].isCurrent).toBe(false);
    });

    // TC-04: Duplicate season IDs in source
    it('TC-04: should deduplicate seasons with identical IDs in source payload', () => {
      const payloadWithDupes: ExternalCompetitionDetailDto = {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
        type: 'LEAGUE',
        area: { id: 2072, name: 'England', code: 'ENG' },
        seasons: [
          { id: 2502, startDate: '2026-08-21', endDate: '2027-05-30' },
          { id: 2502, startDate: '2026-08-21', endDate: '2027-05-30' },
          { id: 2403, startDate: '2025-08-15', endDate: '2026-05-24' },
        ],
      };

      const result = FootballDataCompetitionMapper.toTransformedCompetition(payloadWithDupes);
      expect(result.seasons).toHaveLength(2);
      expect(result.seasons.map((s) => s.externalId)).toEqual(['2502', '2403']);
    });

    // TC-05: Season code 2026-2027
    it('TC-05: should format cross-year season code as 2026-2027', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 2502,
        startDate: '2026-08-21',
        endDate: '2027-05-30',
      });
      expect(season?.seasonCode).toBe('2026-2027');
    });

    // TC-06: Same-year season
    it('TC-06: should format same-year season code as single year 2024', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 500,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(season?.seasonCode).toBe('2024');
    });

    // TC-07: Missing start date
    it('TC-07: should fallback seasonCode to externalId when startDate is missing', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 999,
        startDate: '',
        endDate: '2027-05-30',
      });
      expect(season?.startDate).toBeNull();
      expect(season?.seasonCode).toBe('999');
    });

    // TC-08: Missing end date
    it('TC-08: should format seasonCode using start year when endDate is missing', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 888,
        startDate: '2026-08-21',
        endDate: '',
      });
      expect(season?.endDate).toBeNull();
      expect(season?.seasonCode).toBe('2026');
    });

    // TC-09: Invalid date
    it('TC-09: should handle invalid date strings gracefully without NaN or crash', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 777,
        startDate: 'invalid-date',
        endDate: 'not-a-date',
      });
      expect(season?.seasonCode).toBe('777');
      expect(season?.startDate).toBe('invalid-date');
    });

    // TC-10: Nullable winner
    it('TC-10: should handle null/absent winner cleanly', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 666,
        startDate: '2024-08-01',
        endDate: '2025-05-01',
        winner: null,
      });
      expect(season).toBeDefined();
      expect(season?.externalId).toBe('666');
    });

    // TC-11: Empty seasons array
    it('TC-11: should handle empty seasons array gracefully', () => {
      const payload: ExternalCompetitionDetailDto = {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
        type: 'LEAGUE',
        area: { id: 2072, name: 'England', code: 'ENG' },
        currentSeason: null,
        seasons: [],
      };

      const result = FootballDataCompetitionMapper.toTransformedCompetition(payload);
      expect(result.seasons).toEqual([]);
    });

    // TC-12: No undefined/NaN leakage in JSON
    it('TC-12: should not leak "undefined", "NaN", or "null-null" in TransformedSeason', () => {
      const season = FootballDataCompetitionMapper.toTransformedSeason({
        id: 111,
        startDate: undefined as any,
        endDate: undefined as any,
        currentMatchday: null,
      });

      const jsonStr = JSON.stringify(season);
      expect(jsonStr).not.toContain('"undefined"');
      expect(jsonStr).not.toContain('NaN');
      expect(jsonStr).not.toContain('null-null');
      expect(jsonStr).not.toContain('Invalid Date');
    });
  });
});
