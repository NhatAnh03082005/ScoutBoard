import { ReconcileSportmonksMatchUseCase } from './reconcile-sportmonks-match.use-case';
import { ExternalMatchMappingRepository } from '../ports/external-match-mapping.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { SportmonksFixtureDto } from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';

describe('ReconcileSportmonksMatchUseCase', () => {
  let useCase: ReconcileSportmonksMatchUseCase;
  let mockMappingRepo: jest.Mocked<ExternalMatchMappingRepository>;
  let mockMatchRepo: any;

  const homeTeamUuid = 'home-team-uuid-1';
  const awayTeamUuid = 'away-team-uuid-2';

  const sampleSportmonksFixture: SportmonksFixtureDto = {
    id: 18535518,
    name: 'Manchester United vs Manchester City',
    starting_at: '2026-08-22 19:00:00',
  };

  const canonicalMatch: MatchOrmEntity = {
    id: 'match-canonical-uuid-1',
    competitionId: 'comp-uuid',
    seasonId: 'season-uuid',
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

  beforeEach(() => {
    mockMappingRepo = {
      findByProviderFixtureId: jest.fn(),
      findByMatchId: jest.fn(),
      saveMapping: jest.fn(),
    };

    mockMatchRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    useCase = new ReconcileSportmonksMatchUseCase(
      mockMappingRepo,
      mockMatchRepo,
    );
  });

  it('TC-10: should return cached MATCHED from external_match_mappings in O(1) time', async () => {
    mockMappingRepo.findByProviderFixtureId.mockResolvedValueOnce({
      id: 'map-uuid-1',
      matchId: 'match-canonical-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
      confidence: 1.0,
      status: 'CONFIRMED',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      match: canonicalMatch,
    });

    mockMatchRepo.findOne.mockResolvedValueOnce(canonicalMatch);

    const result = await useCase.execute({
      fixture: sampleSportmonksFixture,
      resolvedHomeTeamId: homeTeamUuid,
      resolvedAwayTeamId: awayTeamUuid,
    });

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-canonical-uuid-1');
    expect(mockMatchRepo.find).not.toHaveBeenCalled(); // O(1) Cache hit - DB query bypassed
    expect(mockMappingRepo.saveMapping).not.toHaveBeenCalled();
  });

  it('TC-11: should reconcile candidate matches and save mapping on cache miss', async () => {
    mockMappingRepo.findByProviderFixtureId.mockResolvedValueOnce(null);
    mockMatchRepo.find.mockResolvedValueOnce([canonicalMatch]);

    const result = await useCase.execute({
      fixture: sampleSportmonksFixture,
      resolvedHomeTeamId: homeTeamUuid,
      resolvedAwayTeamId: awayTeamUuid,
    });

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe('match-canonical-uuid-1');
    expect(mockMappingRepo.saveMapping).toHaveBeenCalledWith({
      matchId: 'match-canonical-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
      confidence: 1.0,
      status: 'CONFIRMED',
      metadata: expect.objectContaining({
        startingAt: '2026-08-22 19:00:00',
      }),
    });
  });

  it('TC-12: should not save mapping when fixture is UNMATCHED', async () => {
    mockMappingRepo.findByProviderFixtureId.mockResolvedValueOnce(null);
    mockMatchRepo.find.mockResolvedValueOnce([]); // No candidates

    const result = await useCase.execute({
      fixture: sampleSportmonksFixture,
      resolvedHomeTeamId: homeTeamUuid,
      resolvedAwayTeamId: awayTeamUuid,
    });

    expect(result.status).toBe('UNMATCHED');
    expect(result.matchId).toBeNull();
    expect(mockMappingRepo.saveMapping).not.toHaveBeenCalled();
  });

  it('TC-13: should handle batch reconciliation with mixed statuses and error isolation', async () => {
    mockMappingRepo.findByProviderFixtureId.mockResolvedValue(null);
    mockMatchRepo.find
      .mockResolvedValueOnce([canonicalMatch]) // Match 1 -> MATCHED
      .mockResolvedValueOnce([]) // Match 2 -> UNMATCHED
      .mockResolvedValueOnce([
        canonicalMatch,
        { ...canonicalMatch, id: 'match-2', matchDate: new Date('2026-08-22T19:30:00Z') },
      ]); // Match 3 -> AMBIGUOUS

    const batchResult = await useCase.executeBatch([
      { fixture: sampleSportmonksFixture, resolvedHomeTeamId: homeTeamUuid, resolvedAwayTeamId: awayTeamUuid },
      { fixture: { ...sampleSportmonksFixture, id: 2 }, resolvedHomeTeamId: homeTeamUuid, resolvedAwayTeamId: awayTeamUuid },
      { fixture: { ...sampleSportmonksFixture, id: 3 }, resolvedHomeTeamId: homeTeamUuid, resolvedAwayTeamId: awayTeamUuid },
      { fixture: null as any, resolvedHomeTeamId: homeTeamUuid, resolvedAwayTeamId: awayTeamUuid }, // INVALID
    ]);

    expect(batchResult.total).toBe(4);
    expect(batchResult.matched).toBe(1);
    expect(batchResult.unmatched).toBe(1);
    expect(batchResult.ambiguous).toBe(1);
    expect(batchResult.invalid).toBe(1);
  });
});
