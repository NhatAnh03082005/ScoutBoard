import {
  CrossProviderMatchReconciliationService,
} from './cross-provider-match-reconciliation.service';
import { SportmonksFixtureDto } from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

describe('CrossProviderMatchReconciliationService', () => {
  const homeTeamUuid = 'home-team-uuid-1';
  const awayTeamUuid = 'away-team-uuid-2';
  const compPremierLeague = 'comp-pl-uuid';
  const compFACup = 'comp-facup-uuid';
  const season2026 = 'season-2026-uuid';
  const season2025 = 'season-2025-uuid';

  const sampleSportmonksFixture: SportmonksFixtureDto = {
    id: 18535518,
    name: 'Manchester United vs Manchester City',
    starting_at: '2026-08-22 19:00:00',
  };

  const canonicalMatchPL: MatchOrmEntity = {
    id: 'match-canonical-uuid-1',
    competitionId: compPremierLeague,
    seasonId: season2026,
    homeTeamId: homeTeamUuid,
    awayTeamId: awayTeamUuid,
    matchDate: new Date('2026-08-22T19:00:00Z'),
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 1,
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '327117',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: null as any,
    season: null as any,
    homeTeam: null as any,
    awayTeam: null as any,
    matchStatistics: [],
  };

  it('TC-01: should match exact match with same date, time, and teams', () => {
    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [canonicalMatchPL],
      homeTeamUuid,
      awayTeamUuid,
    );

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-canonical-uuid-1');
    expect(result.confidence).toBe(1.0);
  });

  it('TC-02: should handle timezone normalization and small kickoff drift within tolerance', () => {
    // Sportmonks fixture at 19:00 UTC, canonical match at 21:00 UTC (2h drift)
    const canonicalWithDrift: MatchOrmEntity = {
      ...canonicalMatchPL,
      matchDate: new Date('2026-08-22T21:00:00Z'),
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [canonicalWithDrift],
      homeTeamUuid,
      awayTeamUuid,
      { kickoffToleranceHours: 24 },
    );

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-canonical-uuid-1');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('TC-03: should reject match when kickoff drift exceeds tolerance (UNMATCHED)', () => {
    const canonicalDifferentWeek: MatchOrmEntity = {
      ...canonicalMatchPL,
      matchDate: new Date('2026-08-30T19:00:00Z'), // 8 days later
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [canonicalDifferentWeek],
      homeTeamUuid,
      awayTeamUuid,
      { kickoffToleranceHours: 24 },
    );

    expect(result.status).toBe('UNMATCHED');
    expect(result.matchId).toBeNull();
  });

  it('TC-04: should reject reversed home/away fixture (different venue/game)', () => {
    const reversedCandidate: MatchOrmEntity = {
      ...canonicalMatchPL,
      homeTeamId: awayTeamUuid,
      awayTeamId: homeTeamUuid,
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [reversedCandidate],
      homeTeamUuid,
      awayTeamUuid,
    );

    expect(result.status).toBe('UNMATCHED');
    expect(result.matchId).toBeNull();
  });

  it('TC-05: should disambiguate cup vs league with same teams using targetCompetitionId', () => {
    const matchFACup: MatchOrmEntity = {
      ...canonicalMatchPL,
      id: 'match-cup-uuid',
      competitionId: compFACup,
    };

    // Candidate pool contains both League and Cup matches on similar date
    const candidates = [canonicalMatchPL, matchFACup];

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      candidates,
      homeTeamUuid,
      awayTeamUuid,
      { targetCompetitionId: compFACup },
    );

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-cup-uuid');
  });

  it('TC-06: should disambiguate different seasons with same teams using targetSeasonId', () => {
    const matchPrevSeason: MatchOrmEntity = {
      ...canonicalMatchPL,
      id: 'match-prev-season-uuid',
      seasonId: season2025,
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [canonicalMatchPL, matchPrevSeason],
      homeTeamUuid,
      awayTeamUuid,
      { targetSeasonId: season2026 },
    );

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-canonical-uuid-1');
  });

  it('TC-07: should reject as AMBIGUOUS when multiple candidate matches are within kickoff tolerance', () => {
    const matchCandidate1: MatchOrmEntity = {
      ...canonicalMatchPL,
      id: 'match-1',
      matchDate: new Date('2026-08-22T19:00:00Z'),
    };
    const matchCandidate2: MatchOrmEntity = {
      ...canonicalMatchPL,
      id: 'match-2',
      matchDate: new Date('2026-08-22T19:30:00Z'),
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [matchCandidate1, matchCandidate2],
      homeTeamUuid,
      awayTeamUuid,
    );

    expect(result.status).toBe('AMBIGUOUS');
    expect(result.matchId).toBeNull();
    expect(result.reason).toContain('Ambiguous match');
  });

  it('TC-08: should return UNMATCHED when candidate pool is empty', () => {
    const result = CrossProviderMatchReconciliationService.reconcile(
      sampleSportmonksFixture,
      [],
      homeTeamUuid,
      awayTeamUuid,
    );

    expect(result.status).toBe('UNMATCHED');
    expect(result.matchId).toBeNull();
  });

  it('TC-09: should return INVALID when fixture or team IDs are missing', () => {
    const invalidFixture: SportmonksFixtureDto = {
      id: 100,
      name: 'Invalid',
      starting_at: '',
    };

    const result = CrossProviderMatchReconciliationService.reconcile(
      invalidFixture,
      [canonicalMatchPL],
      homeTeamUuid,
      awayTeamUuid,
    );

    expect(result.status).toBe('INVALID');
  });
});
