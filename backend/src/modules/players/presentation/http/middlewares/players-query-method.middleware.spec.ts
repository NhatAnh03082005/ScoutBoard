import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import passport from 'passport';
import { PlayersQueryMethodMiddleware } from './players-query-method.middleware';
import { QueryPlayersUseCase } from 'src/modules/players/application/use-cases/query-players.use-case';

describe('PlayersQueryMethodMiddleware (SEC-001)', () => {
  let middleware: PlayersQueryMethodMiddleware;
  let mockQueryUseCase: { execute: jest.Mock };
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockQueryUseCase = {
      execute: jest.fn(),
    };
    middleware = new PlayersQueryMethodMiddleware(
      mockQueryUseCase as unknown as QueryPlayersUseCase,
    );

    mockReq = {
      method: 'QUERY',
      headers: {},
      body: {
        query: {
          kind: 'CONDITION',
          field: 'goals_per90',
          operator: 'GTE',
          value: 0.3,
        },
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    (middleware as any)?.storage?.onApplicationShutdown?.();
    jest.restoreAllMocks();
  });

  describe('Non-QUERY methods bypass', () => {
    it('should call next() for GET requests without authentication or query execution', async () => {
      mockReq.method = 'GET';
      const passportSpy = jest.spyOn(passport, 'authenticate');

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(passportSpy).not.toHaveBeenCalled();
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should call next() for PATCH requests', async () => {
      mockReq.method = 'PATCH';
      await middleware.use(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('SEC-001 Authentication Enforcements', () => {
    it('should return 401 when no Authorization header is present', async () => {
      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (_req: any, _res: any, _next: any) => {
            callback(null, false, new Error('No auth token'));
          };
        });

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 401 when token is malformed', async () => {
      mockReq.headers.authorization = 'Bearer malformed.token.xyz';
      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (_req: any, _res: any, _next: any) => {
            callback(null, false, {
              name: 'JsonWebTokenError',
              message: 'jwt malformed',
            });
          };
        });

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 401 when token has expired', async () => {
      mockReq.headers.authorization = 'Bearer expired.token';
      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (_req: any, _res: any, _next: any) => {
            callback(null, false, {
              name: 'TokenExpiredError',
              message: 'jwt expired',
            });
          };
        });

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 401 when token has invalid signature', async () => {
      mockReq.headers.authorization = 'Bearer invalid.sig.token';
      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (_req: any, _res: any, _next: any) => {
            callback(null, false, {
              name: 'JsonWebTokenError',
              message: 'invalid signature',
            });
          };
        });

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return 200 and query results when caller is authenticated with USER role', async () => {
      const userPayload = {
        id: 'user-1',
        email: 'scout@scoutboard.com',
        roles: ['USER'],
      };

      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (req: any, _res: any, _next: any) => {
            callback(null, userPayload, null);
          };
        });

      const mockResult = {
        items: [{ id: 'player-1', name: 'A. Striker' }],
        pagination: { total: 1, limit: 20, offset: 0 },
      };
      mockQueryUseCase.execute.mockResolvedValue(mockResult);

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(userPayload);
      expect(mockQueryUseCase.execute).toHaveBeenCalledWith({
        queryNode: mockReq.body.query,
        pagination: undefined,
        scope: undefined,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 200 and query results when caller is authenticated with ADMIN role', async () => {
      const adminPayload = {
        id: 'admin-1',
        email: 'admin@scoutboard.com',
        roles: ['ADMIN'],
      };

      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (req: any, _res: any, _next: any) => {
            callback(null, adminPayload, null);
          };
        });

      const mockResult = {
        items: [{ id: 'player-2', name: 'B. Midfielder' }],
        pagination: { total: 1, limit: 20, offset: 0 },
      };
      mockQueryUseCase.execute.mockResolvedValue(mockResult);

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(adminPayload);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Validation handling', () => {
    it('should return 400 when body does not contain query object', async () => {
      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (req: any, _res: any, _next: any) => {
            callback(null, { id: 'user-1', roles: ['USER'] }, null);
          };
        });

      mockReq.body = {};

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Request body must contain a "query" object.',
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('SEC-002 Rate Limiting Enforcements', () => {
    let originalLimit: string | undefined;
    let originalTtl: string | undefined;

    beforeEach(() => {
      originalLimit = process.env.THROTTLE_QUERY_LIMIT;
      originalTtl = process.env.THROTTLE_QUERY_TTL_MS;
      process.env.THROTTLE_QUERY_LIMIT = '3';
      process.env.THROTTLE_QUERY_TTL_MS = '60000';

      jest
        .spyOn(passport, 'authenticate')
        .mockImplementation((_strategy, _options, callback: any) => {
          return (req: any, _res: any, _next: any) => {
            callback(null, { id: 'user-1', roles: ['USER'] }, null);
          };
        });
      mockQueryUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { total: 0 },
      });
    });

    afterEach(() => {
      process.env.THROTTLE_QUERY_LIMIT = originalLimit;
      process.env.THROTTLE_QUERY_TTL_MS = originalTtl;
    });

    it('should allow requests below limit (1st hit)', async () => {
      mockReq.ip = '192.168.1.10';
      mockRes.header = jest.fn();

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockQueryUseCase.execute).toHaveBeenCalled();
    });

    it('should allow request exactly at limit (3rd hit)', async () => {
      mockReq.ip = '192.168.1.20';
      mockRes.header = jest.fn();

      // Hit 1 & 2
      await middleware.use(mockReq, mockRes, mockNext);
      await middleware.use(mockReq, mockRes, mockNext);

      // Hit 3 (exactly at limit of 3)
      mockRes.status.mockClear();
      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 429 when limit is exceeded (4th hit)', async () => {
      mockReq.ip = '192.168.1.30';
      mockRes.header = jest.fn();

      // Hit 1, 2, 3
      await middleware.use(mockReq, mockRes, mockNext);
      await middleware.use(mockReq, mockRes, mockNext);
      await middleware.use(mockReq, mockRes, mockNext);

      // Hit 4 (exceeded)
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      mockQueryUseCase.execute.mockClear();

      await middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.header).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String),
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: 'ThrottlerException: Too Many Requests',
        }),
      );
      expect(mockQueryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should maintain separate trackers for different client IPs', async () => {
      mockRes.header = jest.fn();

      // Exhaust IP A (10.0.0.1)
      const reqA = { ...mockReq, ip: '10.0.0.1' };
      for (let i = 0; i < 3; i++) {
        await middleware.use(reqA, mockRes, mockNext);
      }
      mockRes.status.mockClear();
      await middleware.use(reqA, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // IP B (10.0.0.2) should still be allowed
      const reqB = { ...mockReq, ip: '10.0.0.2' };
      mockRes.status.mockClear();
      mockQueryUseCase.execute.mockClear();
      await middleware.use(reqB, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockQueryUseCase.execute).toHaveBeenCalled();
    });
  });
});
