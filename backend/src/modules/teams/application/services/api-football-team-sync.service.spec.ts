import { Test, TestingModule } from '@nestjs/testing';
import { ApiFootballTeamSyncService } from './api-football-team-sync.service';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { PersistTeamUseCase } from '../use-cases/persist-team.use-case';
import { PersistSeasonTeamsUseCase } from '../../../seasons/application/use-cases/persist-season-teams.use-case';

describe('ApiFootballTeamSyncService', () => {
  let service: ApiFootballTeamSyncService;
  let mockApiClient: jest.Mocked<ApiFootballClientPort>;
  let mockPersistTeamUseCase: jest.Mocked<PersistTeamUseCase>;
  let mockPersistSeasonTeamsUseCase: jest.Mocked<PersistSeasonTeamsUseCase>;

  beforeEach(async () => {
    mockApiClient = {
      getTeams: jest.fn(),
    } as any;

    mockPersistTeamUseCase = {
      execute: jest.fn(),
    } as any;

    mockPersistSeasonTeamsUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballTeamSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        { provide: PersistTeamUseCase, useValue: mockPersistTeamUseCase },
        {
          provide: PersistSeasonTeamsUseCase,
          useValue: mockPersistSeasonTeamsUseCase,
        },
      ],
    }).compile();

    service = module.get<ApiFootballTeamSyncService>(
      ApiFootballTeamSyncService,
    );
  });

  it('should fetch teams, persist teams, and link to season_teams', async () => {
    mockApiClient.getTeams.mockResolvedValueOnce({
      get: 'teams',
      parameters: { league: '39', season: '2024' },
      errors: [],
      results: 2,
      paging: { current: 1, total: 1 },
      response: [
        {
          team: {
            id: 33,
            name: 'Manchester United',
            code: 'MUN',
            country: 'England',
            founded: 1878,
            national: false,
            logo: 'https://media.api-sports.io/football/teams/33.png',
          },
          venue: { id: 556, name: 'Old Trafford', city: 'Manchester', address: null, capacity: null, surface: null, image: null },
        },
        {
          team: {
            id: 34,
            name: 'Newcastle',
            code: 'NEW',
            country: 'England',
            founded: 1892,
            national: false,
            logo: 'https://media.api-sports.io/football/teams/34.png',
          },
          venue: { id: 557, name: "St. James' Park", city: 'Newcastle', address: null, capacity: null, surface: null, image: null },
        },
      ],
    });

    mockPersistTeamUseCase.execute
      .mockResolvedValueOnce({ id: 'team-uuid-33' } as any)
      .mockResolvedValueOnce({ id: 'team-uuid-34' } as any);


    mockPersistSeasonTeamsUseCase.execute.mockResolvedValueOnce({
      seasonId: 'season-uuid-1',
      totalTeams: 2,
      linkedCount: 2,
    });

    const summary = await service.syncTeamsByCompetition(39, 2024, 'season-uuid-1');

    expect(summary.totalRequested).toBe(2);
    expect(summary.successful).toBe(2);
    expect(summary.failed).toBe(0);
    expect(mockPersistTeamUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockPersistSeasonTeamsUseCase.execute).toHaveBeenCalledWith({
      seasonId: 'season-uuid-1',
      teamIds: ['team-uuid-33', 'team-uuid-34'],
    });
  });
});
