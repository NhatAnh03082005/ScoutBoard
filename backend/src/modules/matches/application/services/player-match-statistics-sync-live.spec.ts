import { PlayerMatchStatisticsSyncService } from './player-match-statistics-sync.service';
import { SportmonksApiClient } from '../../../external-football/application/ports/sportmonks-api-client.port';
import { SportmonksFixtureDto } from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';

describe('PlayerMatchStatisticsSyncService - Live Re-sync & Snapshot Replacement', () => {
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
  const player1Uuid = 'player-uuid-cr7';

  const mockMatch = {
    id: canonicalMatchId,
    homeTeamId: homeTeamUuid,
    awayTeamId: awayTeamUuid,
  };

  const mockPlayer1 = {
    id: player1Uuid,
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shirtNumber: 7,
    currentTeamId: homeTeamUuid,
    externalProvider: 'SPORTMONKS',
    externalId: '2001',
  };

  beforeEach(() => {
    mockSportmonksClient = {
      getFixtureById: jest.fn(),
      getFixturesByDate: jest.fn(),
      getFixturesBetween: jest.fn(),
      getFixturesBySeason: jest.fn(),
    };

    mockReconcileUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'MATCHED',
        matchId: canonicalMatchId,
        confidence: 1.0,
        matchedMatch: mockMatch,
      }),
    };

    mockPersistStatsUseCase = {
      execute: jest.fn(),
      executeBatch: jest.fn().mockImplementation((matchId, inputs) =>
        Promise.resolve({
          total: inputs.length,
          persisted: inputs.length,
          skipped: 0,
          statistics: inputs,
          errors: [],
        }),
      ),
    };

    mockMatchRepo = {
      findOne: jest.fn().mockResolvedValue(mockMatch),
      find: jest.fn(),
    };

    mockPlayerRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([mockPlayer1]),
    };

    mockTeamRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: homeTeamUuid,
        name: 'Manchester United FC',
      }),
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

  it('TC-01 to TC-03: should transition through live states (scheduled -> live 45m -> live 75m -> finished 90m)', async () => {
    // 1. Live Snapshot at 45m: 1 Goal, 20 Passes
    const snapshot45m: SportmonksFixtureDto = {
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
          jersey_number: 7,
          player: { id: 2001, name: 'Cristiano Ronaldo' },
          details: [
            { code: 'minutes-played', value: 45 },
            { code: 'goals', value: 1 },
            { code: 'passes-total', value: 20 },
            { code: 'passes-accurate', value: 18 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snapshot45m);
    const res45m = await service.syncStatisticsByFixtureId(18535518);
    expect(res45m.persisted).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenLastCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ minutesPlayed: 45, goals: 1, passesAttempted: 20 })],
    );

    // 2. Live Snapshot at 75m: 2 Goals, 35 Passes (REPLACES snapshot, does not SUM)
    const snapshot75m: SportmonksFixtureDto = {
      ...snapshot45m,
      lineups: [
        {
          ...snapshot45m.lineups![0],
          details: [
            { code: 'minutes-played', value: 75 },
            { code: 'goals', value: 2 },
            { code: 'passes-total', value: 35 },
            { code: 'passes-accurate', value: 30 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snapshot75m);
    const res75m = await service.syncStatisticsByFixtureId(18535518);
    expect(res75m.persisted).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenLastCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ minutesPlayed: 75, goals: 2, passesAttempted: 35 })],
    );

    // 3. Finished Match Snapshot at 90m: 2 Goals, 42 Passes
    const snapshot90m: SportmonksFixtureDto = {
      ...snapshot45m,
      lineups: [
        {
          ...snapshot45m.lineups![0],
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'goals', value: 2 },
            { code: 'passes-total', value: 42 },
            { code: 'passes-accurate', value: 36 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snapshot90m);
    const res90m = await service.syncStatisticsByFixtureId(18535518);
    expect(res90m.persisted).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenLastCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ minutesPlayed: 90, goals: 2, passesAttempted: 42 })],
    );
  });

  it('TC-04 to TC-06: should handle late post-match corrections accurately as state replacement', async () => {
    // Post-match review reduces 2 goals to 1 goal (e.g. own-goal correction)
    const correctedSnapshot: SportmonksFixtureDto = {
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
          jersey_number: 7,
          player: { id: 2001, name: 'Cristiano Ronaldo' },
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'goals', value: 1 }, // Corrected down to 1
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(correctedSnapshot);
    const result = await service.syncStatisticsByFixtureId(18535518);

    expect(result.persisted).toBe(1);
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalledWith(
      canonicalMatchId,
      [expect.objectContaining({ goals: 1 })],
    );
  });
});
