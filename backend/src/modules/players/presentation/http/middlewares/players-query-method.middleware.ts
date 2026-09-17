/**
 * ScoutBoard — HTTP QUERY Method Middleware
 *
 * NestJS does not support the HTTP QUERY method natively via decorators.
 * This middleware intercepts ALL requests to /api/players, checks for
 * req.method === 'QUERY', handles those requests directly, and calls
 * next() for all other methods (GET, PATCH, etc.) so they continue to
 * the PlayersController unmodified.
 *
 * This is the ONLY mechanism for routing QUERY /players. There is no
 * POST fallback and no modification to the existing controller.
 */

import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  Optional,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import {
  InjectThrottlerStorage,
  ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { QueryPlayersUseCase } from 'src/modules/players/application/use-cases/query-players.use-case';

@Injectable()
export class PlayersQueryMethodMiddleware implements NestMiddleware {
  private readonly storage: ThrottlerStorage;

  constructor(
    private readonly queryPlayersUseCase: QueryPlayersUseCase,
    @Optional()
    @InjectThrottlerStorage()
    throttlerStorage?: ThrottlerStorage,
  ) {
    this.storage = throttlerStorage || new ThrottlerStorageService();
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only intercept HTTP QUERY method — all others pass through to the controller
    if (req.method.toUpperCase() !== 'QUERY') {
      next();
      return;
    }

    // SEC-001: Authenticate request using existing Passport JWT Strategy
    try {
      await new Promise<void>((resolve, reject) => {
        passport.authenticate(
          'jwt',
          { session: false },
          (err: any, user: any, info: any) => {
            if (err) {
              return reject(err);
            }
            if (!user) {
              return reject(
                new UnauthorizedException(
                  info?.message || 'Access Token không hợp lệ hoặc đã hết hạn',
                ),
              );
            }
            (req as any).user = user;
            resolve();
          },
        )(req, res, (err: any) => (err ? reject(err) : resolve()));
      });
    } catch (authErr: unknown) {
      if (authErr instanceof HttpException) {
        const status = authErr.getStatus();
        const response = authErr.getResponse();
        res
          .status(status)
          .json(
            typeof response === 'string'
              ? { statusCode: status, message: response }
              : response,
          );
        return;
      }
      res.status(401).json({
        statusCode: 401,
        message: 'Access Token không hợp lệ hoặc đã hết hạn',
      });
      return;
    }

    // SEC-002: Enforce Rate Limiting for QUERY /api/players (default: 60 req / 60s per client IP)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const ttlMs = parseInt(process.env.THROTTLE_QUERY_TTL_MS || '60000', 10);
    const limit = parseInt(process.env.THROTTLE_QUERY_LIMIT || '60', 10);
    const key = `query-players-${clientIp}`;

    const record = await this.storage.increment(
      key,
      ttlMs,
      limit,
      ttlMs,
      'query-players',
    );

    if (record.isBlocked) {
      res.header('Retry-After', String(Math.max(1, record.timeToBlockExpire)));
      res.status(429).json({
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
      });
      return;
    }

    // At this point: req.method === 'QUERY', request is authenticated, and within rate limit.
    // The global JSON body parser has already parsed req.body.
    const body = req.body as Record<string, unknown>;

    try {
      // Validate that the body has a query field
      if (!body || typeof body !== 'object' || !body['query']) {
        throw new BadRequestException(
          'Request body must contain a "query" object.',
        );
      }

      const result = await this.queryPlayersUseCase.execute({
        queryNode: body['query'],
        pagination: body['pagination'] as any,
        scope: body['scope'] as any,
      });

      res.status(200).json(result);
    } catch (err: unknown) {
      // Re-map NestJS HttpExceptions to Express responses
      if (err instanceof HttpException) {
        const status = err.getStatus();
        const response = err.getResponse();
        res
          .status(status)
          .json(
            typeof response === 'string'
              ? { statusCode: status, message: response }
              : response,
          );
        return;
      }

      // Unexpected errors — 500 with no internal detail exposed
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
