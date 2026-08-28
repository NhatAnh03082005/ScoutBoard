import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataPlayerTeamHistoryMapper } from '../../../external-football/infrastructure/mappers/football-data-player-team-history.mapper';
import {
  PlayerMatchAppearanceInput,
  PlayerPersonDetailInput,
} from '../../../external-football/domain/models/transformed-player-team-history.model';
import {
  PersistPlayerTeamHistoryUseCase,
  PersistPlayerTeamHistoryResult,
} from '../use-cases/persist-player-team-history.use-case';

export interface SyncPlayerTeamHistoryResult {
  externalPlayerId: string;
  totalDerivedTeams: number;
  histories: PersistPlayerTeamHistoryResult[];
}

export interface SyncPlayerTeamHistoriesBatchResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: SyncPlayerTeamHistoryResult[];
  errors: Array<{ externalPlayerId: string; error: string }>;
}

@Injectable()
export class PlayerTeamHistorySyncService {
  private readonly logger = new Logger(PlayerTeamHistorySyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistPlayerTeamHistoryUseCase: PersistPlayerTeamHistoryUseCase,
  ) {}

  /**
   * Syncs the career team history of a single player from external provider
   */
  async syncPlayerTeamHistoryById(
    externalPlayerId: number | string,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncPlayerTeamHistoryResult> {
    if (
      externalPlayerId === null ||
      externalPlayerId === undefined ||
      String(externalPlayerId).trim() === ''
    ) {
      throw new BadRequestException('Player external ID is required');
    }

    const extIdStr = String(externalPlayerId).trim();
    this.logger.log(`[Sync] Extracting team history for player ID: ${extIdStr}`);

    // 1. EXTRACT: Call external API for player detail
    const rawPlayer = await this.footballApiClient.getPlayerById(extIdStr);

    // 2. EXTRACT: Call external API for player matches (if supported)
    let rawMatches: any = null;
    if (typeof this.footballApiClient.getPlayerMatches === 'function') {
      try {
        rawMatches = await this.footballApiClient.getPlayerMatches(extIdStr);
      } catch (err: any) {
        // If 404/not available, log and proceed with player detail only
        this.logger.warn(
          `[Sync] Could not fetch matches for player ${extIdStr}: ${err?.message || err}`,
        );
      }
    }

    // 3. TRANSFORM: Prepare inputs for pure mapper
    const playerDetail: PlayerPersonDetailInput = {
      playerExternalId: extIdStr,
      currentTeamExternalId: rawPlayer?.currentTeam?.id
        ? String(rawPlayer.currentTeam.id)
        : null,
      currentTeamContractStart: rawPlayer?.currentTeam?.contract?.start || null,
      currentTeamContractUntil: rawPlayer?.currentTeam?.contract?.until || null,
      shirtNumber:
        rawPlayer?.shirtNumber !== null && rawPlayer?.shirtNumber !== undefined
          ? Number(rawPlayer.shirtNumber)
          : null,
    };

    const appearances: PlayerMatchAppearanceInput[] = [];
    const matchesList = Array.isArray(rawMatches?.matches) ? rawMatches.matches : [];

    for (const match of matchesList) {
      if (!match) continue;

      // Identify which team player represented (exclude opponent)
      let representedTeamId: string | null = null;
      if (
        rawPlayer?.currentTeam?.id &&
        (match.homeTeam?.id === rawPlayer.currentTeam.id ||
          match.awayTeam?.id === rawPlayer.currentTeam.id)
      ) {
        representedTeamId = String(rawPlayer.currentTeam.id);
      } else if (match.homeTeam?.id) {
        representedTeamId = String(match.homeTeam.id);
      } else if (match.awayTeam?.id) {
        representedTeamId = String(match.awayTeam.id);
      }

      if (representedTeamId) {
        appearances.push({
          playerExternalId: extIdStr,
          teamExternalId: representedTeamId,
          matchUtcDate: match.utcDate,
        });
      }
    }

    const transformedHistories = FootballDataPlayerTeamHistoryMapper.deriveTimelineFromAppearances(
      playerDetail,
      appearances,
      provider,
    );

    this.logger.log(
      `[Sync] Derived ${transformedHistories.length} team history intervals for player ${extIdStr}`,
    );

    // 4. LOAD: Persist team histories via Use Case
    const persistedResults = await this.persistPlayerTeamHistoryUseCase.executeMany(
      transformedHistories,
    );

    return {
      externalPlayerId: extIdStr,
      totalDerivedTeams: transformedHistories.length,
      histories: persistedResults,
    };
  }

  /**
   * Batch syncs team histories for multiple players with error isolation
   */
  async syncPlayerTeamHistories(
    externalPlayerIds: Array<string | number>,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncPlayerTeamHistoriesBatchResult> {
    if (!externalPlayerIds || externalPlayerIds.length === 0) {
      return {
        totalRequested: 0,
        successful: 0,
        failed: 0,
        results: [],
        errors: [],
      };
    }

    const results: SyncPlayerTeamHistoryResult[] = [];
    const errors: Array<{ externalPlayerId: string; error: string }> = [];

    this.logger.log(
      `[Sync] Starting batch team history sync for ${externalPlayerIds.length} players`,
    );

    for (const id of externalPlayerIds) {
      if (id === null || id === undefined || String(id).trim() === '') {
        continue;
      }
      const extIdStr = String(id).trim();

      try {
        const syncResult = await this.syncPlayerTeamHistoryById(extIdStr, provider);
        results.push(syncResult);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync team history for player ${extIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalPlayerId: extIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: externalPlayerIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
