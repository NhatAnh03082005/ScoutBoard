import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';
import { SyncLogLevel } from '../../domain/enums/sync-log-level.enum';

export interface DataSyncJobLogItem {
  id: string;
  level: SyncLogLevel;
  entityType: string | null;
  externalId: string | null;
  message: string;
  details: Record<string, any> | null;
  createdAt: Date;
}

export interface GetDataSyncJobResult {
  id: string;
  initiatedBy: string | null;
  initiatedByName?: string | null;
  competitionId: string;
  competitionName?: string | null;
  seasonId: string;
  seasonCode?: string | null;
  provider: string;
  status: SyncJobStatus;
  triggerType: SyncTriggerType;
  scope: SyncScope;
  target: SyncTarget;
  mode: SyncMode;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  logs: DataSyncJobLogItem[];
}
