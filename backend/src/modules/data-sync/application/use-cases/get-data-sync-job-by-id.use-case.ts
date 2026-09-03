import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  DATA_SYNC_JOB_REPOSITORY,
  DataSyncJobRepository,
} from '../ports/data-sync-job.repository';
import { GetDataSyncJobResult } from '../dto/get-data-sync-job.result';

@Injectable()
export class GetDataSyncJobByIdUseCase {
  constructor(
    @Inject(DATA_SYNC_JOB_REPOSITORY)
    private readonly jobRepository: DataSyncJobRepository,
  ) {}

  async execute(jobId: string): Promise<GetDataSyncJobResult> {
    if (!jobId || String(jobId).trim() === '') {
      throw new NotFoundException(`Job ID is required`);
    }

    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Data sync job with ID ${jobId} not found`);
    }

    return {
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
    };
  }
}
