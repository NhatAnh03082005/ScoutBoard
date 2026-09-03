import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApiFootballCompetitionSyncService } from './api-football-competition-sync.service';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { PersistCompetitionWithSeasonsUseCase } from '../use-cases/persist-competition-with-seasons.use-case';

describe('ApiFootballCompetitionSyncService', () => {
  let service: ApiFootballCompetitionSyncService;
  let mockApiClient: jest.Mocked<ApiFootballClientPort>;
  let mockPersistUseCase: jest.Mocked<PersistCompetitionWithSeasonsUseCase>;

  beforeEach(async () => {
    mockApiClient = {
      getLeagues: jest.fn(),
    } as any;

    mockPersistUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballCompetitionSyncService,
        { provide: API_FOOTBALL_CLIENT, useValue: mockApiClient },
        {
          provide: PersistCompetitionWithSeasonsUseCase,
          useValue: mockPersistUseCase,
        },
      ],
    }).compile();

    service = module.get<ApiFootballCompetitionSyncService>(
      ApiFootballCompetitionSyncService,
    );
  });

  it('should sync competition and persist seasons successfully', async () => {
    mockApiClient.getLeagues.mockResolvedValueOnce({
      get: 'leagues',
      parameters: { id: '39' },
      errors: [],
      results: 1,
      paging: { current: 1, total: 1 },
      response: [
        {
          league: {
            id: 39,
            name: 'Premier League',
            type: 'League',
            logo: 'https://media.api-sports.io/football/leagues/39.png',
          },
          country: { name: 'England', code: 'GB-ENG', flag: null },
          seasons: [
            {
              year: 2024,
              start: '2024-08-16',
              end: '2025-05-25',
              current: true,
            },
          ],
        },
      ],
    });

    mockPersistUseCase.execute.mockResolvedValueOnce({
      competition: { id: 'comp-uuid-1' } as any,
      seasons: [{ id: 'season-uuid-1' }] as any,
    });


    const res = await service.syncCompetitionById(39);

    expect(mockApiClient.getLeagues).toHaveBeenCalledWith({ id: 39 });
    expect(mockPersistUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: '39',
        name: 'Premier League',
      }),
    );
    expect(res.competitionId).toBe('comp-uuid-1');
    expect(res.totalSeasons).toBe(1);
  });

  it('should throw NotFoundException if league is not found', async () => {
    mockApiClient.getLeagues.mockResolvedValueOnce({
      get: 'leagues',
      parameters: {},
      errors: [],
      results: 0,
      paging: { current: 1, total: 1 },
      response: [],
    });

    await expect(service.syncCompetitionById(99999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
