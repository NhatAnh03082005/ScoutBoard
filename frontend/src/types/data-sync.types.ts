export type SyncScope = 'SEASON' | 'DATE' | 'MATCH';
export type SyncTarget =
  | 'FULL'
  | 'MATCHES'
  | 'PLAYER_MATCH_STATISTICS'
  | 'SEASON_STATISTICS';
export type SyncMode = 'REFRESH' | 'MISSING';
export type SyncJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED';
export type SyncLogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface TriggerAdminSyncRequest {
  competitionId: string;
  seasonId: string;
  scope?: SyncScope;
  target?: SyncTarget;
  mode?: SyncMode;
  date?: string;
  matchId?: string;
}

export interface ExecuteAdminSyncResponse {
  jobId: string;
  status: SyncJobStatus;
  scope: SyncScope;
  target: SyncTarget;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  matchedCount: number;
  unresolvedCount: number;
  ambiguousCount: number;
  startedAt: string;
  completedAt: string;
  errorMessage: string | null;
}

export interface SyncJobLog {
  id: string;
  level: SyncLogLevel;
  entityType: string | null;
  externalId: string | null;
  message: string;
  details: Record<string, any> | null;
  createdAt: string;
}

export interface SyncJobDetail {
  id: string;
  initiatedBy: string | null;
  initiatedByName: string | null;
  competitionId: string;
  competitionName: string | null;
  seasonId: string;
  seasonCode: string | null;
  provider: string;
  status: SyncJobStatus;
  triggerType: string;
  scope: SyncScope;
  target: SyncTarget;
  mode: SyncMode;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  logs?: SyncJobLog[];
}

export interface ListSyncJobsResponse {
  items: SyncJobDetail[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ListSyncJobsParams {
  limit?: number;
  offset?: number;
  status?: SyncJobStatus;
  competitionId?: string;
  seasonId?: string;
}

export interface SeasonItem {
  id: string;
  competitionId: string;
  name: string;
  seasonCode: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
}

export interface MatchItem {
  id: string;
  competitionId: string;
  seasonId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  matchDate: string;
  status: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeamName?: string;
  awayTeamName?: string;
}
