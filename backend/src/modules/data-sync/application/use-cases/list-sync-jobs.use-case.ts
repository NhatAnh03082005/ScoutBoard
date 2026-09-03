import { Injectable, Inject } from '@nestjs/common';
import {
  DATA_SYNC_JOB_REPOSITORY,
  DataSyncJobRepository,
  ListJobsParams,
} from '../ports/data-sync-job.repository';
import { GetDataSyncJobResult } from '../dto/get-data-sync-job.result';

export interface ListSyncJobsResult {
  items: GetDataSyncJobResult[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

@Injectable()
export class ListSyncJobsUseCase {
  constructor(
    @Inject(DATA_SYNC_JOB_REPOSITORY)
    private readonly jobRepository: DataSyncJobRepository,
  ) {}

  async execute(params?: ListJobsParams): Promise<ListSyncJobsResult> {
    const limit = params?.limit && params.limit > 0 ? params.limit : 20;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;

    const [jobs, total] = await this.jobRepository.listJobs({
      limit,
      offset,
      status: params?.status,
      competitionId: params?.competitionId,
      seasonId: params?.seasonId,
    });

    const items: GetDataSyncJobResult[] = jobs.map((job) => ({
      id: job.id,
      initiatedBy: job.initiatedBy,
      initiatedByName: job.user?.fullName ?? null,
      competitionId: job.competitionId,
      competitionName: job.competition?.name ?? null,
      seasonId: job.seasonId,
      seasonCode: job.season?.seasonCode ?? null,
      provider: job.provider,
      status: job.status,
      triggerType: job.triggerType,
      scope: job.scope,
      target: job.target,
      mode: job.mode,
      processedCount: job.processedCount,
      createdCount: job.createdCount,
      updatedCount: job.updatedCount,
      failedCount: job.failedCount,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      metadata: job.metadata,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      logs: (job.logs || []).map((log) => ({
        id: log.id,
        level: log.level,
        entityType: log.entityType,
        externalId: log.externalId,
        message: log.message,
        details: log.details,
        createdAt: log.createdAt,
      })),
    }));

    return {
      items,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }
}
