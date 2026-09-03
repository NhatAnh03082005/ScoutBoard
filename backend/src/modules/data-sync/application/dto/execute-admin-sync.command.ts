import { SyncScope } from '../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../domain/enums/sync-target.enum';
import { SyncMode } from '../../domain/enums/sync-mode.enum';
import { SyncTriggerType } from '../../domain/enums/sync-trigger-type.enum';

export interface ExecuteAdminSyncCommand {
  adminUserId?: string | null;
  competitionId: string;
  seasonId: string;
  scope?: SyncScope;
  target?: SyncTarget;
  mode?: SyncMode;
  date?: string;
  matchId?: string;
  triggerType?: SyncTriggerType;
}
