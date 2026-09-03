import { DataSyncJobOrmEntity } from '../../infrastructure/persistence/typeorm/entities/data-sync-job.orm-entity';
import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';

export const DATA_SYNC_JOB_REPOSITORY = Symbol('DATA_SYNC_JOB_REPOSITORY');

export interface CreateDataSyncJobInput {
  initiatedBy?: string | null;
  competitionId: string;
  seasonId: string;
  provider?: string;
  status?: SyncJobStatus;
  triggerType?: SyncTriggerType;
  scope?: SyncScope;
  target?: SyncTarget;
  mode?: SyncMode;
  metadata?: Record<string, any> | null;
}

export interface UpdateDataSyncJobInput {
  status?: SyncJobStatus;
  processedCount?: number;
  createdCount?: number;
  updatedCount?: number;
  failedCount?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

export interface FindActiveJobParams {
  competitionId: string;
  seasonId: string;
  target?: SyncTarget;
  scope?: SyncScope;
}

export interface ListJobsParams {
  limit?: number;
  offset?: number;
  status?: SyncJobStatus;
  competitionId?: string;
  seasonId?: string;
}

export interface DataSyncJobRepository {
  create(input: CreateDataSyncJobInput): Promise<DataSyncJobOrmEntity>;
  update(
    id: string,
    input: UpdateDataSyncJobInput,
  ): Promise<DataSyncJobOrmEntity>;
  findById(id: string): Promise<DataSyncJobOrmEntity | null>;
  findActiveJob(
    params: FindActiveJobParams,
  ): Promise<DataSyncJobOrmEntity | null>;
  listJobs(params?: ListJobsParams): Promise<[DataSyncJobOrmEntity[], number]>;
}
