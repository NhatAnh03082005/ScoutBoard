import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiFootballPlayerMatchStatsSyncService } from './api-football-player-match-stats-sync.service';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { PersistPlayerMatchStatisticsUseCase } from '../use-cases/persist-player-match-statistics.use-case';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('ApiFootballPlayerMatchStatsSyncService', () => {
  let service: ApiFootballPlayerMatchStatsSyncService;
  let mockApiClient: jest.Mocked<ApiFootballClientPort>;
  let mockPersistStatsUseCase: jest.Mocked<PersistPlayerMatchStatisticsUseCase>;
  let mockMatchRepo: any;
  let mockTeamRepo: any;
  let mockPlayerRepo: any;

  beforeEach(async () => {
    mockApiClient = {
      getFixturePlayers: jest.fn(),
    } as any;

    mockPersistStatsUseCase = {
      executeBatch: jest.fn(),
    } as any;

    mockMatchRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'match-uuid-1' }),
    };

    mockTeamRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'team-uuid-33', externalId: '33' },
      ]),
    };

    mockPlayerRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'player-uuid-545', externalId: '545' },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballPlayerMatchStatsSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        {
          provide: PersistPlayerMatchStatisticsUseCase,
          useValue: mockPersistStatsUseCase,
        },
        { provide: getRepositoryToken(MatchOrmEntity), useValue: mockMatchRepo },
        { provide: getRepositoryToken(TeamOrmEntity), useValue: mockTeamRepo },
        { provide: getRepositoryToken(PlayerOrmEntity), useValue: mockPlayerRepo },
      ],
    }).compile();

    service = module.get<ApiFootballPlayerMatchStatsSyncService>(
      ApiFootballPlayerMatchStatsSyncService,
    );
  });

  it('should fetch fixture player stats and persist via use case batch', async () => {
    mockApiClient.getFixturePlayers.mockResolvedValueOnce({
      get: 'fixtures/players',
      parameters: { fixture: '1208021' },
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [
        {
          team: { id: 33, name: 'Manchester United', logo: null },
          players: [
            {
              player: { id: 545, name: 'Noussair Mazraoui', photo: null },
              statistics: [
                {
                  games: { minutes: 81, number: 3, position: 'D', rating: '7.5', captain: false, substitute: false },
                  offsides: null,
                  shots: { total: 1, on: 1 },
                  goals: { total: 0, conceded: 0, assists: 1, saves: null },
                  passes: { total: 38, key: 2, accuracy: '35' },
                  tackles: { total: 2, blocks: 1, interceptions: 3 },
                  duels: { total: 7, won: 6 },
                  dribbles: { attempts: 2, success: 1, past: null },
                  fouls: { drawn: 1, committed: 0 },
                  cards: { yellow: 0, red: 0 },
                  penalty: { won: null, commited: null, scored: 0, missed: 0, saved: null },
                },
              ],
            },
          ],
        },
      ],
    });

    mockPersistStatsUseCase.executeBatch.mockResolvedValueOnce({
      total: 1,
      persisted: 1,
      skipped: 0,
      statistics: [{} as any],
      errors: [],
    });

    const summary = await service.syncStatisticsByFixtureId(1208021, 'match-uuid-1');

    expect(summary.totalPlayersInFixture).toBe(1);
    expect(summary.persistedCount).toBe(1);
    expect(summary.skippedCount).toBe(0);
    expect(summary.unresolvedPlayers).toBe(0);
    expect(mockApiClient.getFixturePlayers).toHaveBeenCalledWith({ fixture: 1208021 });
    expect(mockPersistStatsUseCase.executeBatch).toHaveBeenCalledWith(
      'match-uuid-1',
      expect.arrayContaining([
        expect.objectContaining({
          matchId: 'match-uuid-1',
          playerId: 'player-uuid-545',
          teamId: 'team-uuid-33',
          rating: 7.5,
          goals: 0,
          assists: 1,
        }),
      ]),
    );
  });
});
