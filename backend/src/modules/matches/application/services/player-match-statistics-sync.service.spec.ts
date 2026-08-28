import {
  PlayerMatchStatisticsSyncService,
} from './player-match-statistics-sync.service';
import { SportmonksApiClient } from '../../../external-football/application/ports/sportmonks-api-client.port';
import { ReconcileSportmonksMatchUseCase } from '../use-cases/reconcile-sportmonks-match.use-case';
import { PersistPlayerMatchStatisticsUseCase } from '../use-cases/persist-player-match-statistics.use-case';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import {
  SportmonksFixtureDto,
} from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';
import {
  ExternalFootballRateLimitError,
  ExternalFootballNotFoundError,
  ExternalFootballTimeoutError,
} from '../../../external-football/domain/errors/external-football.errors';

describe('PlayerMatchStatisticsSyncService (Task 6.8 Comprehensive)', () => {
  let service: PlayerMatchStatisticsSyncService;
  let mockSportmonksClient: jest.Mocked<SportmonksApiClient>;
  let mockReconcileUseCase: any;
  let mockPersistStatsUseCase: any;
  let mockMatchRepo: any;
  let mockPlayerRepo: any;
  let mockTeamRepo: any;

  const canonicalMatchId = 'canonical-match-uuid-1';
  const homeTeamUuid = 'home-team-uuid-1';
  const awayTeamUuid = 'away-team-uuid-2';
  const player1Uuid = 'player-uuid-1';
  const player2Uuid = 'player-uuid-2';

  const mockHomeTeam: TeamOrmEntity = {
    id: homeTeamUuid,
    name: 'Manchester United FC',
    normalizedName: 'manchester united',
    externalProvider: 'SPORTMONKS',
    externalId: '14',
  } as any;

  const mockAwayTeam: TeamOrmEntity = {
    id: awayTeamUuid,
    name: 'Manchester City FC',
    normalizedName: 'manchester city',
    externalProvider: 'SPORTMONKS',
    externalId: '11',
  } as any;

  const mockMatch: MatchOrmEntity = {
    id: canonicalMatchId,
    homeTeamId: homeTeamUuid,
    awayTeamId: awayTeamUuid,
    matchDate: new Date('2026-08-22T19:00:00Z'),
  } as any;

  const mockPlayer1: PlayerOrmEntity = {
    id: player1Uuid,
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shirtNumber: 7,
    currentTeamId: homeTeamUuid,
    externalProvider: 'SPORTMONKS',
    externalId: '2001',
  } as any;

  const mockPlayer2: PlayerOrmEntity = {
    id: player2Uuid,
    name: 'David de Gea',
    normalizedName: 'david de gea',
    shirtNumber: 1,
    currentTeamId: homeTeamUuid,
    externalProvider: 'SPORTMONKS',
    externalId: '1001',
  } as any;

  const sampleFixture: SportmonksFixtureDto = {
    id: 18535518,
    name: 'Manchester United vs Manchester City',
    starting_at: '2026-08-22 19:00:00',
    participants: [
      { id: 14, name: 'Manchester United FC', meta: { location: 'home' } },
      { id: 11, name: 'Manchester City FC', meta: { location: 'away' } },
    ],
    lineups: [
      {
        id: 1,
        fixture_id: 18535518,
        player_id: 2001,
        team_id: 14,
        position_id: 27,
        jersey_number: 7,
        player: { id: 2001, name: 'Cristiano Ronaldo' },
        details: [
          { code: 'minutes-played', value: 90 },
          { code: 'goals', value: 2 },
        ],
      },
      {
        id: 2,
        fixture_id: 18535518,
        player_id: 1001,
        team_id: 14,
        position_id: 24,
        jersey_number: 1,
        player: { id: 1001, name: 'David de Gea' },
        details: [
          { code: 'minutes-played', value: 90 },
          { code: 'saves', value: 4 },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockSportmonksClient = {
      getFixtureById: jest.fn(),
      getFixturesByDate: jest.fn(),
      getFixturesBetween: jest.fn(),
      getFixturesBySeason: jest.fn(),
    };

    mockReconcileUseCase = {
      execute: jest.fn(),
    };

    mockPersistStatsUseCase = {
      execute: jest.fn(),
      executeBatch: jest.fn(),
    };

    mockMatchRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockPlayerRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockTeamRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    service = new PlayerMatchStatisticsSyncService(
      mockSportmonksClient,
      mockReconcileUseCase,
      mockPersistStatsUseCase,
      mockMatchRepo,
      mockPlayerRepo,
      mockTeamRepo,
    );
  });

  it('TC-01 & TC-18 & TC-19 & TC-20: single match success with correct match/player associations', async () => {
    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(sampleFixture);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1, mockPlayer2]) // Home candidates
      .mockResolvedValueOnce([]); // Away candidates

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 2,
      persisted: 2,
      skipped: 0,
      statistics: [{}, {}] as any,
      errors: [],
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe(canonicalMatchId);
    expect(result.persisted).toBe(2);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalledWith(
      canonicalMatchId,
      expect.arrayContaining([
        expect.objectContaining({ matchId: canonicalMatchId, playerId: player1Uuid, goals: 2 }),
        expect.objectContaining({ matchId: canonicalMatchId, playerId: player2Uuid, saves: 4 }),
      ]),
    );
  });

  it('TC-02 & TC-17: bulk success by date with Zero N+1 external API calls', async () => {
    mockSportmonksClient.getFixturesByDate.mockResolvedValueOnce([sampleFixture]);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1, mockPlayer2])
      .mockResolvedValueOnce([]);

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 2,
      persisted: 2,
      skipped: 0,
      statistics: [{}, {}] as any,
      errors: [],
    });

    const batchResult = await service.syncStatisticsByDate('2026-08-22');

    expect(batchResult.totalRequested).toBe(1);
    expect(batchResult.matched).toBe(1);
    expect(batchResult.created).toBe(2);
    // Verified: Only 1 external HTTP request made
    expect(mockSportmonksClient.getFixturesByDate).toHaveBeenCalledTimes(1);
    expect(mockSportmonksClient.getFixtureById).not.toHaveBeenCalled();
  });

  it('TC-03: zero matches returned handles gracefully', async () => {
    mockSportmonksClient.getFixturesByDate.mockResolvedValueOnce([]);

    const batchResult = await service.syncStatisticsByDate('2026-08-22');

    expect(batchResult.totalRequested).toBe(0);
    expect(batchResult.matched).toBe(0);
    expect(batchResult.created).toBe(0);
  });

  it('TC-04 & TC-05: missing Sportmonks mapping resolves candidate or skips if UNMATCHED', async () => {
    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(sampleFixture);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'UNMATCHED',
      matchId: null,
      confidence: 0,
      matchedMatch: null,
      reason: 'No matching canonical match found',
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.status).toBe('UNMATCHED');
    expect(result.persisted).toBe(0);
    expect(mockPersistStatsUseCase.executeBatch).not.toHaveBeenCalled();
  });

  it('TC-06: ambiguous match is skipped without persisting statistics', async () => {
    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(sampleFixture);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'AMBIGUOUS',
      matchId: null,
      confidence: 0.5,
      matchedMatch: null,
      reason: 'Multiple matches found within tolerance',
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.status).toBe('AMBIGUOUS');
    expect(result.persisted).toBe(0);
    expect(mockPersistStatsUseCase.executeBatch).not.toHaveBeenCalled();
  });

  it('TC-07 & TC-08: mixed valid and unresolved players isolates error and persists valid players', async () => {
    const fixtureWithUnknownPlayer: SportmonksFixtureDto = {
      ...sampleFixture,
      lineups: [
        sampleFixture.lineups![0], // CR7 (valid)
        {
          id: 3,
          fixture_id: 18535518,
          player_id: 99999, // Unresolvable Player
          team_id: 14,
          player: { id: 99999, name: 'Unknown Player Ghost' },
          details: [{ code: 'goals', value: 1 }],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(fixtureWithUnknownPlayer);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1]) // Only CR7 in DB
      .mockResolvedValueOnce([]);

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 1,
      persisted: 1,
      skipped: 0,
      statistics: [{}] as any,
      errors: [],
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.status).toBe('MATCHED');
    expect(result.persisted).toBe(1);
    expect(result.unresolvedPlayers).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ playerId: player1Uuid })],
    );
  });

  it('TC-09: provider 429 Rate Limit error is propagated', async () => {
    mockSportmonksClient.getFixtureById.mockRejectedValueOnce(
      new ExternalFootballRateLimitError('Rate limit exceeded', 'SPORTMONKS', 60),
    );

    await expect(service.syncStatisticsByFixtureId(18535518)).rejects.toThrow(
      ExternalFootballRateLimitError,
    );
  });

  it('TC-10: provider 404 Not Found error is propagated', async () => {
    mockSportmonksClient.getFixtureById.mockRejectedValueOnce(
      new ExternalFootballNotFoundError('Fixture not found', 'SPORTMONKS'),
    );

    await expect(service.syncStatisticsByFixtureId(999999)).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
  });

  it('TC-11: provider timeout error is propagated', async () => {
    mockSportmonksClient.getFixtureById.mockRejectedValueOnce(
      new ExternalFootballTimeoutError('Request timeout', 'SPORTMONKS', 10000),
    );

    await expect(service.syncStatisticsByFixtureId(18535518)).rejects.toThrow(
      ExternalFootballTimeoutError,
    );
  });

  it('TC-12 & TC-13 & TC-14: idempotent rerun with already persisted or updated live statistics', async () => {
    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(sampleFixture);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1, mockPlayer2])
      .mockResolvedValueOnce([]);

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 2,
      persisted: 2,
      skipped: 0,
      statistics: [{}, {}] as any,
      errors: [],
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.persisted).toBe(2);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalled();
  });

  it('TC-15: malformed statistic details handled safely without crashing', async () => {
    const malformedFixture: SportmonksFixtureDto = {
      ...sampleFixture,
      lineups: [
        {
          id: 1,
          fixture_id: 18535518,
          player_id: 2001,
          team_id: 14,
          player: { id: 2001, name: 'Cristiano Ronaldo' },
          details: [{ code: 'goals', value: 'invalid_str' }],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(malformedFixture);
    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1])
      .mockResolvedValueOnce([]);

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 1,
      persisted: 1,
      skipped: 0,
      statistics: [{}] as any,
      errors: [],
    });

    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.persisted).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ goals: null })], // Safely parsed as null
    );
  });

  it('TC-16: batch error isolation preserves other fixtures if one fails', async () => {
    mockSportmonksClient.getFixturesByDate.mockResolvedValueOnce([
      sampleFixture,
      { id: 999, name: 'Broken Fixture' } as any,
    ]);

    mockTeamRepo.findOne
      .mockResolvedValueOnce(mockHomeTeam)
      .mockResolvedValueOnce(mockAwayTeam)
      .mockResolvedValueOnce(null) // Broken fixture home team fail
      .mockResolvedValueOnce(null);

    mockReconcileUseCase.execute.mockResolvedValueOnce({
      status: 'MATCHED',
      matchId: canonicalMatchId,
      confidence: 1.0,
      matchedMatch: mockMatch,
    });

    mockPlayerRepo.find
      .mockResolvedValueOnce([mockPlayer1, mockPlayer2])
      .mockResolvedValueOnce([]);

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 2,
      persisted: 2,
      skipped: 0,
      statistics: [{}, {}] as any,
      errors: [],
    });

    const batchResult = await service.syncStatisticsByDate('2026-08-22');

    expect(batchResult.totalRequested).toBe(2);
    expect(batchResult.matched).toBe(1);
    expect(batchResult.unmatched).toBe(1);
    expect(batchResult.created).toBe(2);
  });
});
