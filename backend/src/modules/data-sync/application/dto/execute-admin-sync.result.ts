import { SyncJobStatus } from '../../domain/enums/sync-job-status.enum';
import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';

export interface ExecuteAdminSyncResult {
  jobId: string;
  status: SyncJobStatus;
  scope: SyncScope;
  target: SyncTarget;
  mode: SyncMode;
  competitionId: string;
  seasonId: string;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  matchedCount?: number;
  unresolvedCount?: number;
  ambiguousCount?: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage?: string | null;
}
