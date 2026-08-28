import { ConfigService } from '@nestjs/config';
import { FootballDataOrgClient } from './football-data-org.client';
import {
  ExternalFootballBadRequestError,
  ExternalFootballUnauthorizedError,
  ExternalFootballForbiddenError,
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
  ExternalFootballServerError,
  ExternalFootballTimeoutError,
  ExternalFootballNetworkError,
  ExternalFootballInvalidResponseError,
} from '../../domain/errors/external-football.errors';

describe('FootballDataOrgClient', () => {
  let client: FootballDataOrgClient;
  let mockConfigService: jest.Mocked<ConfigService>;
  const originalFetch = global.fetch;

  const mockApiKey = 'test_api_token_xyz123';
  const mockBaseUrl = 'https://api.football-data.org/v4';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'FOOTBALL_API_BASE_URL') return mockBaseUrl;
        if (key === 'FOOTBALL_API_KEY') return mockApiKey;
        if (key === 'FOOTBALL_API_PROVIDER') return 'football-data.org';
        if (key === 'FOOTBALL_API_TIMEOUT') return 5000;
        return defaultValue;
      }),
    } as any;

    client = new FootballDataOrgClient(mockConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // TC-01: Successful GET
  it('TC-01: Successful GET - should return competition list DTO on HTTP 200', async () => {
    const mockResponsePayload = {
      count: 1,
      competitions: [
        {
          id: 2021,
          area: { id: 2072, name: 'England', code: 'ENG' },
          name: 'Premier League',
          code: 'PL',
          type: 'LEAGUE',
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'x-requests-available-minute': '9',
        'x-requestcounter-reset': '45',
      }),
      json: jest.fn().mockResolvedValue(mockResponsePayload),
    });

    const result = await client.getCompetitions();

    expect(result).toBeDefined();
    expect(result.count).toBe(1);
    expect(result.competitions).toHaveLength(1);
    expect(result.competitions[0].code).toBe('PL');
    expect(result.rateLimitMeta?.requestsRemaining).toBe(9);
    expect(result.rateLimitMeta?.resetSeconds).toBe(45);
  });

  // TC-02: Query Parameters
  it('TC-02: Query Parameters - should append filters correctly to URL search params', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ count: 1, matches: [{ id: 101, status: 'FINISHED' }] }),
    });
    global.fetch = mockFetch;

    await client.getMatches({
      competitions: 'PL,PD',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      status: 'FINISHED',
      season: 2026,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/v4/matches');
    expect(calledUrl.searchParams.get('competitions')).toBe('PL,PD');
    expect(calledUrl.searchParams.get('dateFrom')).toBe('2026-08-01');
    expect(calledUrl.searchParams.get('dateTo')).toBe('2026-08-31');
    expect(calledUrl.searchParams.get('status')).toBe('FINISHED');
    expect(calledUrl.searchParams.get('season')).toBe('2026');
  });

  // TC-03: Authentication Header
  it('TC-03: Authentication Header - should send X-Auth-Token header and not expose in output', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ id: 2021, name: 'Premier League', code: 'PL' }),
    });
    global.fetch = mockFetch;

    await client.getCompetitionById('PL');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.headers['X-Auth-Token']).toBe(mockApiKey);
    expect(fetchOptions.headers['Accept']).toBe('application/json');
  });

  // TC-04: HTTP 400
  it('TC-04: HTTP 400 - should throw ExternalFootballBadRequestError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Invalid query filter supplied' }),
    });

    await expect(client.getCompetitions({ plan: 'INVALID' })).rejects.toThrow(
      ExternalFootballBadRequestError,
    );
  });

  // TC-05: HTTP 401
  it('TC-05: HTTP 401 - should throw ExternalFootballUnauthorizedError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Your API token is invalid' }),
    });

    await expect(client.getCompetitions()).rejects.toThrow(
      ExternalFootballUnauthorizedError,
    );
  });

  // TC-06: HTTP 403
  it('TC-06: HTTP 403 - should throw ExternalFootballForbiddenError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Resource restricted under your plan' }),
    });

    await expect(client.getCompetitionById('SA')).rejects.toThrow(
      ExternalFootballForbiddenError,
    );
  });

  // TC-07: HTTP 404
  it('TC-07: HTTP 404 - should throw ExternalFootballNotFoundError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Resource not found' }),
    });

    await expect(client.getTeamById(999999)).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
  });

  // TC-08: HTTP 429 Rate Limit
  it('TC-08: HTTP 429 - should throw ExternalFootballRateLimitError with parsed rate limit headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'x-requests-available-minute': '0',
        'x-requestcounter-reset': '30',
        'retry-after': '30',
      }),
      json: jest.fn().mockResolvedValue({ message: 'Too many requests' }),
    });

    try {
      await client.getTeams({ competitionCode: 'PL' });
      fail('Expected ExternalFootballRateLimitError but no error was thrown');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ExternalFootballRateLimitError);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfterSeconds).toBe(30);
      expect(error.requestsRemaining).toBe(0);
      expect(error.resetSeconds).toBe(30);
    }
  });

  // TC-09: HTTP 500+
  it('TC-09: HTTP 500 - should throw ExternalFootballServerError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Bad Gateway' }),
    });

    await expect(client.getMatches()).rejects.toThrow(ExternalFootballServerError);
  });

  // TC-10: Timeout
  it('TC-10: Timeout - should throw ExternalFootballTimeoutError when request aborts/times out', async () => {
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'TimeoutError';

    global.fetch = jest.fn().mockRejectedValue(timeoutError);

    await expect(client.getPlayerById(44)).rejects.toThrow(ExternalFootballTimeoutError);
  });

  // TC-11: Network Error
  it('TC-11: Network Error - should throw ExternalFootballNetworkError on connection failure', async () => {
    const networkError = new TypeError('fetch failed: getaddrinfo ENOTFOUND api.football-data.org');

    global.fetch = jest.fn().mockRejectedValue(networkError);

    await expect(client.getMatches()).rejects.toThrow(ExternalFootballNetworkError);
  });

  // TC-12: Invalid JSON / Unexpected Shape
  it('TC-12: Invalid JSON / Shape - should throw ExternalFootballInvalidResponseError when JSON is corrupted or invalid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0')),
    });

    await expect(client.getCompetitions()).rejects.toThrow(
      ExternalFootballInvalidResponseError,
    );
  });

  // TC-13: Empty Data
  it('TC-13: Empty Data - should return empty list gracefully without throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ count: 0, teams: [] }),
    });

    const result = await client.getTeams({ competitionCode: 'PL' });
    expect(result).toBeDefined();
    expect(result.count).toBe(0);
    expect(result.teams).toEqual([]);
  });

  // TC-14: Pagination
  it('TC-14: Pagination - should pass limit and offset correctly to query parameters', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ count: 10, teams: [] }),
    });
    global.fetch = mockFetch;

    await client.getTeams({ limit: 20, offset: 40 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('limit')).toBe('20');
    expect(calledUrl.searchParams.get('offset')).toBe('40');
  });

  // TC-15: Secret Safety
  it('TC-15: Secret Safety - should not expose raw API key in error messages', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Invalid token' }),
    });

    try {
      await client.getCompetitions();
      fail('Expected error');
    } catch (error: any) {
      expect(error.message).not.toContain(mockApiKey);
      expect(JSON.stringify(error)).not.toContain(mockApiKey);
    }
  });
});
