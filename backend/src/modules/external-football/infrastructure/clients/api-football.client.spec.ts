import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiFootballClient } from './api-football.client';
import {
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

describe('ApiFootballClient', () => {
  let client: ApiFootballClient;
  let configService: ConfigService;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiFootballClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_FOOTBALL_KEY') return 'test-api-key-123';
              if (key === 'API_FOOTBALL_BASE_URL')
                return 'https://v3.football.api-sports.io';
              if (key === 'API_FOOTBALL_TIMEOUT') return '5000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<ApiFootballClient>(ApiFootballClient);
    configService = module.get<ConfigService>(ConfigService);
    fetchMock = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined and configured', () => {
    expect(client).toBeDefined();
    expect(client.isConfigured()).toBe(true);
  });

  it('should throw ServiceUnavailableException if API key is missing', async () => {
    const unconfiguredClient = new ApiFootballClient({
      get: jest.fn().mockReturnValue(''),
    } as any);

    await expect(unconfiguredClient.getPlayers({ team: 33 })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should successfully make GET request with correct headers', async () => {
    const mockResponse = {
      get: 'players',
      parameters: { team: '33' },
      errors: [],
      results: 1,
      response: [
        {
          player: {
            id: 18883,
            name: 'Aaron Wan-Bissaka',
            photo: 'https://media.api-sports.io/football/players/18883.png',
          },
        },
      ],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await client.getPlayers({ team: 33 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    const calledOptions = fetchMock.mock.calls[0][1];

    expect(calledUrl).toContain(
      'https://v3.football.api-sports.io/players?team=33',
    );
    expect(calledOptions.headers['x-apisports-key']).toBe('test-api-key-123');
    expect(result.results).toBe(1);
    expect(result.response[0].player.name).toBe('Aaron Wan-Bissaka');
  });

  it('should retry with backoff on HTTP 429 rate limit', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate Limit Exceeded',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          get: 'players/squads',
          parameters: { team: '33' },
          errors: [],
          results: 1,
          response: [{ team: { id: 33, name: 'Man Utd' }, players: [] }],
        }),
      });

    const result = await client.getSquadByTeam({ team: 33 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.results).toBe(1);
  });

  it('should throw HttpException on 4xx error (e.g. 404)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    await expect(client.getPlayerById(999999 as any)).rejects.toThrow(
      HttpException,
    );
  });

  it('should call getLeagues with correct endpoint and query params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        get: 'leagues',
        parameters: { id: '39' },
        errors: [],
        results: 1,
        response: [{ league: { id: 39, name: 'Premier League' } }],
      }),
    });

    const res = await client.getLeagues({ id: 39 });
    expect(res.results).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/leagues?id=39');
  });

  it('should call getTeams with correct endpoint and query params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        get: 'teams',
        parameters: { league: '39', season: '2024' },
        errors: [],
        results: 1,
        response: [{ team: { id: 33, name: 'Manchester United' } }],
      }),
    });

    const res = await client.getTeams({ league: 39, season: 2024 });
    expect(res.results).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/teams?league=39&season=2024',
    );
  });

  it('should call getFixtures with correct endpoint and query params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        get: 'fixtures',
        parameters: { league: '39', season: '2024' },
        errors: [],
        results: 1,
        response: [{ fixture: { id: 1208021 } }],
      }),
    });

    const res = await client.getFixtures({ league: 39, season: 2024 });
    expect(res.results).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/fixtures?league=39&season=2024',
    );
  });

  it('should call getFixturePlayers with correct endpoint and query params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        get: 'fixtures/players',
        parameters: { fixture: '1208021' },
        errors: [],
        results: 1,
        response: [{ team: { id: 33 }, players: [] }],
      }),
    });

    const res = await client.getFixturePlayers({ fixture: 1208021 });
    expect(res.results).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/fixtures/players?fixture=1208021',
    );
  });
});
