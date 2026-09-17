import {
  Controller,
  Get,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

export interface HealthResponse {
  status: 'ok' | 'error';
  database?: 'up' | 'down';
}

@ApiTags('Health')
@Controller(['health', 'api/health'])
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness health check endpoint' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application process is alive and accepting requests',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  getLiveness(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check verifying database connectivity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application process is ready and database is connected',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'up' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Database is uninitialized, disconnected, or unresponsive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        database: { type: 'string', example: 'down' },
      },
    },
  })
  async getReadiness(): Promise<HealthResponse> {
    if (!this.dataSource?.isInitialized) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    try {
      // Enforce bounded timeout of 3000ms so /health/ready never hangs indefinitely
      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Database connectivity check timed out'));
        }, 3000);
      });

      try {
        await Promise.race([this.dataSource.query('SELECT 1'), timeoutPromise]);
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }

      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
