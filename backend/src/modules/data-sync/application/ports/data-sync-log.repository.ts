import { DataSyncLogOrmEntity } from '../../infrastructure/persistence/typeorm/entities/data-sync-log.orm-entity';
import { SyncLogLevel } from '../../domain/enums/sync-log-level.enum';

export const DATA_SYNC_LOG_REPOSITORY = Symbol('DATA_SYNC_LOG_REPOSITORY');

export interface CreateDataSyncLogInput {
  jobId: string;
  level: SyncLogLevel;
  entityType?: string | null;
  externalId?: string | null;
  message: string;
  details?: Record<string, any> | null;
}

export interface DataSyncLogRepository {
  create(input: CreateDataSyncLogInput): Promise<DataSyncLogOrmEntity>;
  createBatch(
    inputs: CreateDataSyncLogInput[],
  ): Promise<DataSyncLogOrmEntity[]>;
  findByJobId(jobId: string): Promise<DataSyncLogOrmEntity[]>;
}
