import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: {
    isInitialized: boolean;
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('Liveness: GET /health', () => {
    it('should return HTTP 200 with status "ok"', () => {
      const response = controller.getLiveness();
      expect(response).toEqual({ status: 'ok' });
    });

    it('should never contain credentials or environment secrets in response', () => {
      const response = controller.getLiveness();
      const stringified = JSON.stringify(response);
      expect(stringified).not.toContain('password');
      expect(stringified).not.toContain('secret');
      expect(stringified).not.toContain('postgres');
    });
  });

  describe('Readiness: GET /health/ready', () => {
    it('should return HTTP 200 with database "up" when database query succeeds', async () => {
      const response = await controller.getReadiness();
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(response).toEqual({ status: 'ok', database: 'up' });
    });

    it('should throw ServiceUnavailableException (503) when dataSource is not initialized', async () => {
      mockDataSource.isInitialized = false;

      await expect(controller.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      try {
        await controller.getReadiness();
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(err.getResponse()).toEqual({
          status: 'error',
          database: 'down',
        });
      }
    });

    it('should throw ServiceUnavailableException (503) when database query rejects with connection error', async () => {
      mockDataSource.query.mockRejectedValue(
        new Error('Connection terminated unexpectedly'),
      );

      await expect(controller.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      try {
        await controller.getReadiness();
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(err.getResponse()).toEqual({
          status: 'error',
          database: 'down',
        });
      }
    });

    it('should throw ServiceUnavailableException (503) when database query times out within bounded period', async () => {
      // Mock query that never resolves
      mockDataSource.query.mockImplementation(() => new Promise(() => {}));

      // Fast-forward or use timer mock
      jest.useFakeTimers();
      const readinessPromise = controller.getReadiness();
      jest.advanceTimersByTime(3500);

      await expect(readinessPromise).rejects.toThrow(
        ServiceUnavailableException,
      );
      jest.useRealTimers();
    });

    it('should never expose database URLs, credentials or stack traces on failure', async () => {
      mockDataSource.query.mockRejectedValue(
        new Error(
          'FATAL: password authentication failed for user "postgres" on postgresql://postgres:secret@postgres-db:5432',
        ),
      );

      try {
        await controller.getReadiness();
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        const res = err.getResponse();
        expect(res).toEqual({ status: 'error', database: 'down' });
        const stringified = JSON.stringify(res);
        expect(stringified).not.toContain('secret');
        expect(stringified).not.toContain('postgresql');
        expect(stringified).not.toContain('FATAL');
      }
    });
  });
});
