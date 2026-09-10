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
  HttpException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { QueryPlayersUseCase } from 'src/modules/players/application/use-cases/query-players.use-case';

@Injectable()
export class PlayersQueryMethodMiddleware implements NestMiddleware {
  constructor(private readonly queryPlayersUseCase: QueryPlayersUseCase) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only intercept HTTP QUERY method — all others pass through to the controller
    if (req.method.toUpperCase() !== 'QUERY') {
      next();
      return;
    }

    // At this point: req.method === 'QUERY'
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
