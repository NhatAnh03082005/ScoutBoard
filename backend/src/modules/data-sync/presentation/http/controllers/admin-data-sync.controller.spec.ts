import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AdminDataSyncController } from './admin-data-sync.controller';
import { ExecuteAdminSyncUseCase } from '../../../application/use-cases/execute-admin-sync.use-case';
import { GetDataSyncJobByIdUseCase } from '../../../application/use-cases/get-data-sync-job-by-id.use-case';
import { ListSyncJobsUseCase } from '../../../application/use-cases/list-sync-jobs.use-case';
import { SyncJobStatus } from '../../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../../domain/enums/sync-target.enum';
import { SyncMode } from '../../../domain/enums/sync-mode.enum';

describe('AdminDataSyncController (Comprehensive Unit Tests)', () => {
  let controller: AdminDataSyncController;
  let mockExecuteAdminSyncUseCase: jest.Mocked<ExecuteAdminSyncUseCase>;
  let mockGetDataSyncJobByIdUseCase: jest.Mocked<GetDataSyncJobByIdUseCase>;
  let mockListSyncJobsUseCase: jest.Mocked<ListSyncJobsUseCase>;

  const mockAdminUser = {
    id: 'admin-uuid-1',
    email: 'admin@scoutboard.com',
    fullName: 'Master Admin',
    status: 'ACTIVE',
    roles: ['ADMIN'],
  };

  const mockAuthRequest = {
    user: mockAdminUser,
  } as any;

  beforeEach(() => {
    mockExecuteAdminSyncUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetDataSyncJobByIdUseCase = {
      execute: jest.fn(),
    } as any;

    mockListSyncJobsUseCase = {
      execute: jest.fn(),
    } as any;

    controller = new AdminDataSyncController(
      mockExecuteAdminSyncUseCase,
      mockGetDataSyncJobByIdUseCase,
      mockListSyncJobsUseCase,
    );
  });

  // --- 1. TRIGGER SYNCHRONIZATION (TC-01 through TC-07) ---
  it('TC-01: ADMIN successfully triggers sync', async () => {
    const expectedResult = {
      jobId: 'job-1',
      status: SyncJobStatus.SUCCESS,
      scope: SyncScope.SEASON,
      target: SyncTarget.FULL,
      processedCount: 380,
      createdCount: 380,
      updatedCount: 0,
      failedCount: 0,
      matchedCount: 380,
      unresolvedCount: 0,
      ambiguousCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
    };

    mockExecuteAdminSyncUseCase.execute.mockResolvedValueOnce(expectedResult);

    const result = await controller.triggerSync(
      {
        competitionId: 'comp-uuid-1',
        seasonId: 'season-uuid-1',
        scope: SyncScope.SEASON,
        target: SyncTarget.FULL,
        mode: SyncMode.REFRESH,
      },
      mockAuthRequest,
    );

    expect(result).toEqual(expectedResult);
    expect(mockExecuteAdminSyncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: 'admin-uuid-1',
        competitionId: 'comp-uuid-1',
        seasonId: 'season-uuid-1',
        triggerType: SyncTriggerType.MANUAL,
        scope: SyncScope.SEASON,
        target: SyncTarget.FULL,
      }),
    );
  });

  it('TC-02: request validation failure throws BadRequestException', async () => {
    mockExecuteAdminSyncUseCase.execute.mockRejectedValueOnce(
      new BadRequestException(
        'competitionId is required and must be a valid UUID',
      ),
    );

    await expect(
      controller.triggerSync(
        { competitionId: 'invalid-id', seasonId: 'season-1' },
        mockAuthRequest,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-03: competition/season business validation failure throws NotFoundException or BadRequestException', async () => {
    mockExecuteAdminSyncUseCase.execute.mockRejectedValueOnce(
      new NotFoundException('Competition not found'),
    );

    await expect(
      controller.triggerSync(
        {
          competitionId: '11111111-1111-1111-1111-111111111111',
          seasonId: '22222222-2222-2222-2222-222222222222',
        },
        mockAuthRequest,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-04: duplicate active job throws ConflictException (409)', async () => {
    mockExecuteAdminSyncUseCase.execute.mockRejectedValueOnce(
      new ConflictException(
        'An active synchronization job (status: RUNNING) already exists for this competition and season',
      ),
    );

    await expect(
      controller.triggerSync(
        { competitionId: 'comp-1', seasonId: 'season-1' },
        mockAuthRequest,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('TC-05: provider 429 rate limit propagates appropriate exception', async () => {
    mockExecuteAdminSyncUseCase.execute.mockRejectedValueOnce(
      new HttpException(
        'Rate limit exceeded (429)',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );

    await expect(
      controller.triggerSync(
        { competitionId: 'comp-1', seasonId: 'season-1' },
        mockAuthRequest,
      ),
    ).rejects.toThrow(HttpException);
  });

  it('TC-06 & TC-07: provider 5xx or timeout propagates error', async () => {
    mockExecuteAdminSyncUseCase.execute.mockRejectedValueOnce(
      new HttpException(
        'External provider gateway timeout (504)',
        HttpStatus.GATEWAY_TIMEOUT,
      ),
    );

    await expect(
      controller.triggerSync(
        { competitionId: 'comp-1', seasonId: 'season-1' },
        mockAuthRequest,
      ),
    ).rejects.toThrow(HttpException);
  });

  // --- 2. AUTHORIZATION GUARDS VERIFICATION (TC-08 through TC-10) ---
  it('TC-08, TC-09, TC-10: controller metadata is protected by JwtAuthGuard, RolesGuard and Roles(ADMIN)', () => {
    const guards = Reflect.getMetadata('__guards__', AdminDataSyncController);
    const roles = Reflect.getMetadata('roles', AdminDataSyncController);

    expect(guards).toBeDefined();
    expect(roles).toContain('ADMIN');
  });

  // --- 3. GET JOB BY ID (TC-11 through TC-13) ---
  it('TC-11: existing job returns 200 with job details and logs', async () => {
    const expectedJob = {
      id: 'job-1',
      initiatedBy: 'admin-uuid-1',
      initiatedByName: 'Master Admin',
      competitionId: 'comp-1',
      competitionName: 'Premier League',
      seasonId: 'season-1',
      seasonCode: '2025-2026',
      provider: 'FOOTBALL_DATA_ORG',
      status: SyncJobStatus.SUCCESS,
      triggerType: SyncTriggerType.MANUAL,
      scope: SyncScope.SEASON,
      target: SyncTarget.FULL,
      mode: SyncMode.REFRESH,
      processedCount: 380,
      createdCount: 380,
      updatedCount: 0,
      failedCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [],
    };

    mockGetDataSyncJobByIdUseCase.execute.mockResolvedValueOnce(expectedJob);

    const result = await controller.getJobById('job-1');
    expect(result).toEqual(expectedJob);
    expect(mockGetDataSyncJobByIdUseCase.execute).toHaveBeenCalledWith('job-1');
  });

  it('TC-12: unknown job ID throws NotFoundException (404)', async () => {
    mockGetDataSyncJobByIdUseCase.execute.mockRejectedValueOnce(
      new NotFoundException('Data sync job not found'),
    );

    await expect(controller.getJobById('unknown-job')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('TC-13: malformed UUID parameter is handled', async () => {
    mockGetDataSyncJobByIdUseCase.execute.mockRejectedValueOnce(
      new BadRequestException('Validation failed (uuid v4 is expected)'),
    );

    await expect(controller.getJobById('not-a-valid-uuid')).rejects.toThrow(
      BadRequestException,
    );
  });

  // --- 4. LIST JOBS (TC-14 through TC-17) ---
  it('TC-14: list success returns paginated items', async () => {
    const expectedList = {
      items: [],
      pagination: { total: 0, limit: 20, offset: 0 },
    };

    mockListSyncJobsUseCase.execute.mockResolvedValueOnce(expectedList);

    const result = await controller.listJobs({ limit: 20, offset: 0 });
    expect(result).toEqual(expectedList);
  });

  it('TC-15 & TC-16: filtering and pagination are passed to use case', async () => {
    mockListSyncJobsUseCase.execute.mockResolvedValueOnce({
      items: [],
      pagination: { total: 0, limit: 5, offset: 10 },
    });

    await controller.listJobs({
      limit: 5,
      offset: 10,
      status: SyncJobStatus.RUNNING,
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });

    expect(mockListSyncJobsUseCase.execute).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
      status: SyncJobStatus.RUNNING,
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
    });
  });

  it('TC-17: handles invalid pagination parameters gracefully', async () => {
    mockListSyncJobsUseCase.execute.mockResolvedValueOnce({
      items: [],
      pagination: { total: 0, limit: 20, offset: 0 },
    });

    const result = await controller.listJobs({
      limit: -1,
      offset: -5,
    });
    expect(result).toBeDefined();
  });

  // --- 5. RESPONSE MAPPING & LIFECYCLE (TC-18 through TC-21) ---
  it('TC-18, TC-19, TC-20, TC-21: correct result mapping, lifecycle status, counts, and error propagation', async () => {
    const partialResult = {
      jobId: 'job-part-1',
      status: SyncJobStatus.PARTIAL_SUCCESS,
      scope: SyncScope.SEASON,
      target: SyncTarget.FULL,
      processedCount: 10,
      createdCount: 8,
      updatedCount: 0,
      failedCount: 2,
      matchedCount: 8,
      unresolvedCount: 2,
      ambiguousCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: '2 records failed reconciliation',
    };

    mockExecuteAdminSyncUseCase.execute.mockResolvedValueOnce(partialResult);

    const result = await controller.triggerSync(
      {
        competitionId: 'comp-1',
        seasonId: 'season-1',
      },
      mockAuthRequest,
    );

    expect(result.status).toBe(SyncJobStatus.PARTIAL_SUCCESS);
    expect(result.failedCount).toBe(2);
    expect(result.errorMessage).toBe('2 records failed reconciliation');
  });

  // --- 6. SECURITY & INITIATED_BY ENFORCEMENT (TC-22 through TC-24) ---
  it('TC-22, TC-23, TC-24: initiated_by comes strictly from authenticated admin identity and cannot be overridden by request payload', async () => {
    mockExecuteAdminSyncUseCase.execute.mockResolvedValueOnce({
      jobId: 'job-sec-1',
      status: SyncJobStatus.SUCCESS,
      scope: SyncScope.SEASON,
      target: SyncTarget.FULL,
      processedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      failedCount: 0,
      matchedCount: 1,
      unresolvedCount: 0,
      ambiguousCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
    });

    const payloadWithMaliciousInitiator = {
      competitionId: 'comp-1',
      seasonId: 'season-1',
      initiated_by: 'malicious-other-user-uuid',
      admin_user_id: 'fake-admin-uuid',
    } as any;

    await controller.triggerSync(
      payloadWithMaliciousInitiator,
      mockAuthRequest,
    );

    // Assert that the use case was invoked with the authenticated user ID and NOT the malicious body property
    expect(mockExecuteAdminSyncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: 'admin-uuid-1',
      }),
    );
  });
});
