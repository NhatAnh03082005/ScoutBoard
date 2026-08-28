import { SportmonksFixtureResolver, CanonicalMatchResolutionInput } from './sportmonks-fixture.resolver';
import { SportmonksFixtureDto } from '../../infrastructure/dto/sportmonks-fixture.dto';

describe('SportmonksFixtureResolver', () => {
  const canonicalMatch: CanonicalMatchResolutionInput = {
    matchId: 'match-uuid-1',
    matchDate: '2026-08-22T19:00:00Z',
    homeTeamName: 'Manchester United FC',
    awayTeamName: 'Manchester City FC',
    homeTeamTla: 'MUN',
    awayTeamTla: 'MCI',
    competitionCode: 'PL',
  };

  const sampleSportmonksFixtures: SportmonksFixtureDto[] = [
    {
      id: 18535518,
      name: 'Manchester United vs Manchester City',
      starting_at: '2026-08-22 19:00:00',
      participants: [
        { id: 14, name: 'Manchester United', short_code: 'MUN', meta: { location: 'home' } },
        { id: 11, name: 'Manchester City', short_code: 'MCI', meta: { location: 'away' } },
      ],
    },
    {
      id: 18535519,
      name: 'Chelsea vs Arsenal',
      starting_at: '2026-08-22 16:30:00',
      participants: [
        { id: 18, name: 'Chelsea', short_code: 'CHE', meta: { location: 'home' } },
        { id: 19, name: 'Arsenal', short_code: 'ARS', meta: { location: 'away' } },
      ],
    },
  ];

  it('should resolve match with exact normalized names and same date', () => {
    const result = SportmonksFixtureResolver.resolveMatch(
      canonicalMatch,
      sampleSportmonksFixtures,
    );

    expect(result.matched).toBe(true);
    expect(result.fixture?.id).toBe(18535518);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should resolve match using TLA and stripped FC suffixes', () => {
    const canonical: CanonicalMatchResolutionInput = {
      matchDate: '2026-08-22',
      homeTeamName: 'Chelsea FC',
      awayTeamName: 'Arsenal FC',
      homeTeamTla: 'CHE',
      awayTeamTla: 'ARS',
    };

    const result = SportmonksFixtureResolver.resolveMatch(
      canonical,
      sampleSportmonksFixtures,
    );

    expect(result.matched).toBe(true);
    expect(result.fixture?.id).toBe(18535519);
  });

  it('should reject match when dates are incompatible (different days)', () => {
    const futureCanonical: CanonicalMatchResolutionInput = {
      ...canonicalMatch,
      matchDate: '2026-09-01T15:00:00Z',
    };

    const result = SportmonksFixtureResolver.resolveMatch(
      futureCanonical,
      sampleSportmonksFixtures,
    );

    expect(result.matched).toBe(false);
    expect(result.fixture).toBeNull();
  });

  it('should reject match when home and away are inverted (different venue/fixture)', () => {
    const invertedCanonical: CanonicalMatchResolutionInput = {
      ...canonicalMatch,
      homeTeamName: 'Manchester City FC',
      awayTeamName: 'Manchester United FC',
      homeTeamTla: 'MCI',
      awayTeamTla: 'MUN',
    };

    const result = SportmonksFixtureResolver.resolveMatch(
      invertedCanonical,
      sampleSportmonksFixtures,
    );

    expect(result.matched).toBe(false);
    expect(result.fixture).toBeNull();
  });

  it('should return matched: false when candidates list is empty', () => {
    const result = SportmonksFixtureResolver.resolveMatch(canonicalMatch, []);

    expect(result.matched).toBe(false);
    expect(result.fixture).toBeNull();
  });

  it('should return matched: false when canonical match has missing team names', () => {
    const invalidCanonical: CanonicalMatchResolutionInput = {
      matchDate: '2026-08-22',
      homeTeamName: '',
      awayTeamName: 'Manchester City',
    };

    const result = SportmonksFixtureResolver.resolveMatch(
      invalidCanonical,
      sampleSportmonksFixtures,
    );

    expect(result.matched).toBe(false);
  });

  it('should normalize club names cleanly', () => {
    expect(SportmonksFixtureResolver.normalizeName('Real Madrid C.F.')).toBe('real madrid');
    expect(SportmonksFixtureResolver.normalizeName('Atlético de Madrid')).toBe('atletico madrid');
    expect(SportmonksFixtureResolver.normalizeName('FC Bayern München')).toBe('bayern munchen');
    expect(SportmonksFixtureResolver.normalizeName('Paris Saint-Germain FC')).toBe('paris saint germain');
  });
});
