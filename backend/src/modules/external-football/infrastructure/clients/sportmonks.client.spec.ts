import { ConfigService } from '@nestjs/config';
import { SportmonksClient } from './sportmonks.client';
import {
  ExternalFootballBadRequestError,
  ExternalFootballForbiddenError,
  ExternalFootballInvalidResponseError,
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
  ExternalFootballServerError,
  ExternalFootballTimeoutError,
  ExternalFootballUnauthorizedError,
} from '../../domain/errors/external-football.errors';

describe('SportmonksClient', () => {
  let client: SportmonksClient;
  let mockConfigService: jest.Mocked<ConfigService>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'SPORTMONKS_API_BASE_URL':
            return 'https://api.sportmonks.com/v3/football';
          case 'SPORTMONKS_API_KEY':
            return 'test-api-token';
          case 'SPORTMONKS_PROVIDER':
            return 'SPORTMONKS';
          case 'SPORTMONKS_TIMEOUT':
            return 5000;
          default:
            return defaultValue;
        }
      }),
    } as any;

    client = new SportmonksClient(mockConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should fetch single fixture by ID with default includes using external fixture ID', async () => {
    const mockFixtureResponse = {
      data: {
        id: 18535518,
        name: 'Manchester United vs Manchester City',
        starting_at: '2026-08-22 19:00:00',
        starting_at_timestamp: 1787425200,
        participants: [
          { id: 14, name: 'Manchester United', meta: { location: 'home' } },
          { id: 11, name: 'Manchester City', meta: { location: 'away' } },
        ],
        lineups: [
          { id: 1, fixture_id: 18535518, player_id: 2001, team_id: 14 },
        ],
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'x-ratelimit-remaining': '2990',
        'x-ratelimit-reset': '60',
      }),
      json: jest.fn().mockResolvedValue(mockFixtureResponse),
    });

    const result = await client.getFixtureById(18535518);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fixtures/18535518'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'test-api-token',
        }),
      }),
    );
    expect(result.id).toBe(18535518);
    expect(result.rateLimitMeta?.requestsRemaining).toBe(2990);
  });

  it('should fetch fixtures by date in bulk', async () => {
    const mockListResponse = {
      data: [
        { id: 101, name: 'Match A', starting_at: '2026-08-22 15:00:00' },
        { id: 102, name: 'Match B', starting_at: '2026-08-22 17:30:00' },
      ],
      pagination: { count: 2, per_page: 25, current_page: 1 },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue(mockListResponse),
    });

    const result = await client.getFixturesByDate('2026-08-22');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fixtures/date/2026-08-22'),
      expect.any(Object),
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe(101);
  });

  it('should fetch fixtures between date range', async () => {
    const mockListResponse = {
      data: [{ id: 101, name: 'Match A' }],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue(mockListResponse),
    });

    const result = await client.getFixturesByDateRange('2026-08-20', '2026-08-25');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fixtures/between/2026-08-20/2026-08-25'),
      expect.any(Object),
    );
    expect(result.data).toHaveLength(1);
  });

  it('should handle empty fixture response gracefully in bulk fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ data: [] }),
    });

    const result = await client.getFixturesByDate('2026-08-22');
    expect(result.data).toEqual([]);
  });

  it('should throw ExternalFootballInvalidResponseError on malformed fixture detail response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ invalid: true }),
    });

    await expect(client.getFixtureById(18535518)).rejects.toThrow(
      ExternalFootballInvalidResponseError,
    );
  });

  it('should propagate 400 Bad Request error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Invalid query parameters' }),
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballBadRequestError,
    );
  });

  it('should propagate 401 Unauthorized error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Unauthenticated.' }),
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballUnauthorizedError,
    );
  });

  it('should propagate 403 Forbidden error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Subscription plan does not allow this endpoint' }),
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballForbiddenError,
    );
  });

  it('should propagate 404 Not Found error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Fixture not found' }),
    });

    await expect(client.getFixtureById(999999)).rejects.toThrow(
      ExternalFootballNotFoundError,
    );
  });

  it('should propagate 429 Rate Limit error with retry headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'retry-after': '30',
        'x-ratelimit-remaining': '0',
      }),
      json: jest.fn().mockResolvedValue({ message: 'Rate limit exceeded' }),
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballRateLimitError,
    );
  });

  it('should propagate 500 Server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: jest.fn().mockResolvedValue({ message: 'Internal Server Error' }),
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballServerError,
    );
  });

  it('should handle timeout error properly', async () => {
    global.fetch = jest.fn().mockRejectedValue({
      name: 'TimeoutError',
      message: 'The operation was aborted due to timeout',
    });

    await expect(client.getFixtureById(123)).rejects.toThrow(
      ExternalFootballTimeoutError,
    );
  });

  it('should ensure no database or persistence side-effects exist inside provider client', () => {
    expect((client as any).repository).toBeUndefined();
    expect((client as any).dataSource).toBeUndefined();
    expect((client as any).entityManager).toBeUndefined();
  });
});
