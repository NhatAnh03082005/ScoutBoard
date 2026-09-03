import { Test, TestingModule } from '@nestjs/testing';
import { ApiFootballMatchSyncService } from './api-football-match-sync.service';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { PersistMatchUseCase } from '../use-cases/persist-match.use-case';

describe('ApiFootballMatchSyncService', () => {
  let service: ApiFootballMatchSyncService;
  let mockApiClient: jest.Mocked<ApiFootballClientPort>;
  let mockPersistMatchUseCase: jest.Mocked<PersistMatchUseCase>;

  beforeEach(async () => {
    mockApiClient = {
      getFixtures: jest.fn(),
    } as any;

    mockPersistMatchUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballMatchSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        { provide: PersistMatchUseCase, useValue: mockPersistMatchUseCase },
      ],
    }).compile();

    service = module.get<ApiFootballMatchSyncService>(
      ApiFootballMatchSyncService,
    );
  });

  it('should fetch fixtures from API-Football and persist matches', async () => {
    mockApiClient.getFixtures.mockResolvedValueOnce({
      get: 'fixtures',
      parameters: { league: '39', season: '2024' },
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [
        {
          fixture: {
            id: 1208021,
            date: '2024-08-16T19:00:00+00:00',
            referee: null,
            timezone: 'UTC',
            timestamp: 1723834800,
            periods: { first: null, second: null },
            venue: { id: 556, name: 'Old Trafford', city: 'Manchester' },
            status: { long: 'Finished', short: 'FT', elapsed: 90 },
          },
          league: {
            id: 39,
            name: 'Premier League',
            country: 'England',
            logo: null,
            flag: null,
            season: 2024,
            round: 'Regular Season - 1',
          },
          teams: {
            home: { id: 33, name: 'Man Utd', logo: null, winner: true },
            away: { id: 36, name: 'Fulham', logo: null, winner: false },
          },
          goals: { home: 1, away: 0 },
          score: {
            halftime: { home: 0, away: 0 },
            fulltime: { home: 1, away: 0 },
            extratime: { home: null, away: null },
            penalty: { home: null, away: null },
          },
        },
      ],
    });

    mockPersistMatchUseCase.execute.mockResolvedValueOnce({
      id: 'match-uuid-1',
      matchDate: new Date('2024-08-16T19:00:00+00:00'),
      status: 'FINISHED',
    } as any);

    const summary = await service.syncMatchesByCompetition(
      'comp-uuid-1',
      'season-uuid-1',
      39,
      2024,
    );

    expect(summary.totalRequested).toBe(1);
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(0);
    expect(mockApiClient.getFixtures).toHaveBeenCalledWith({
      league: 39,
      season: 2024,
      round: undefined,
    });
    expect(mockPersistMatchUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '1208021',
        status: 'FINISHED',
      }),
      { competitionId: 'comp-uuid-1', seasonId: 'season-uuid-1' },
    );
  });
});
