import { Test, TestingModule } from '@nestjs/testing';
import { ApiFootballPlayerSyncService } from './api-football-player-sync.service';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { PersistPlayerUseCase } from '../use-cases/persist-player.use-case';
import { PersistPlayerPositionsUseCase } from '../use-cases/persist-player-positions.use-case';
import { PersistPlayerTeamHistoryUseCase } from '../use-cases/persist-player-team-history.use-case';

describe('ApiFootballPlayerSyncService', () => {
  let service: ApiFootballPlayerSyncService;
  let mockApiClient: jest.Mocked<ApiFootballClientPort>;
  let mockPersistPlayerUseCase: jest.Mocked<PersistPlayerUseCase>;
  let mockPersistPlayerPositionsUseCase: jest.Mocked<PersistPlayerPositionsUseCase>;
  let mockPersistPlayerTeamHistoryUseCase: jest.Mocked<PersistPlayerTeamHistoryUseCase>;

  beforeEach(async () => {
    mockApiClient = {
      getSquadByTeam: jest.fn(),
      getTransfers: jest.fn(),
    } as any;

    mockPersistPlayerUseCase = {
      execute: jest.fn(),
    } as any;

    mockPersistPlayerPositionsUseCase = {
      execute: jest.fn(),
    } as any;

    mockPersistPlayerTeamHistoryUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballPlayerSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        { provide: PersistPlayerUseCase, useValue: mockPersistPlayerUseCase },
        {
          provide: PersistPlayerPositionsUseCase,
          useValue: mockPersistPlayerPositionsUseCase,
        },
        {
          provide: PersistPlayerTeamHistoryUseCase,
          useValue: mockPersistPlayerTeamHistoryUseCase,
        },
      ],
    }).compile();

    service = module.get<ApiFootballPlayerSyncService>(
      ApiFootballPlayerSyncService,
    );
  });

  it('should sync squad players, persist positions and team history', async () => {
    mockApiClient.getSquadByTeam.mockResolvedValueOnce({
      get: 'players/squads',
      parameters: { team: '33' },
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [
        {
          team: { id: 33, name: 'Manchester United', logo: null },
          players: [
            {
              id: 18885,
              name: 'K. Darlow',
              age: 35,
              number: 12,
              position: 'Goalkeeper',
              photo: 'https://media.api-sports.io/football/players/18885.png',
            },
          ],
        },
      ],
    });

    mockPersistPlayerUseCase.execute.mockResolvedValueOnce({
      id: 'player-uuid-1',
    } as any);

    mockPersistPlayerPositionsUseCase.execute.mockResolvedValueOnce({} as any);
    mockPersistPlayerTeamHistoryUseCase.execute.mockResolvedValueOnce(
      {} as any,
    );

    const result = await service.syncSquadForTeam('team-uuid-33', 33);

    expect(result.totalSquadPlayers).toBe(1);
    expect(result.persistedPlayers).toBe(1);
    expect(result.positionsPersisted).toBe(1);
    expect(result.historyPersisted).toBe(1);
    expect(mockPersistPlayerUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '18885',
        name: 'K. Darlow',
        primaryPosition: 'GK',
      }),
    );
    expect(mockPersistPlayerPositionsUseCase.execute).toHaveBeenCalledWith({
      playerId: 'player-uuid-1',
      positionCode: 'GK',
      isPrimary: true,
    });
    expect(mockPersistPlayerTeamHistoryUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'player-uuid-1',
        teamId: 'team-uuid-33',
        isCurrent: true,
      }),
    );
  });
});
