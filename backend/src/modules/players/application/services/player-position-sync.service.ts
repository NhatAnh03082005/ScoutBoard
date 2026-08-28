import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
  GetPlayersParams,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataPlayerPositionMapper } from '../../../external-football/infrastructure/mappers/football-data-player-position.mapper';
import { PersistPlayerPositionsUseCase } from '../use-cases/persist-player-positions.use-case';
import { PlayerPositionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-position.orm-entity';

export interface SyncPlayerPositionResult {
  externalPlayerId: string;
  playerId: string | null;
  positionCode: string | null;
  isPrimary: boolean;
  persistedPosition: PlayerPositionOrmEntity | null;
  status: 'SYNCED' | 'NO_POSITION';
}

export interface SyncPlayerPositionsBatchResult {
  totalRequested: number;
  successful: number;
  skipped: number;
  failed: number;
  results: SyncPlayerPositionResult[];
  errors: Array<{ externalPlayerId: string; error: string }>;
}

@Injectable()
export class PlayerPositionSyncService {
  private readonly logger = new Logger(PlayerPositionSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistPlayerPositionsUseCase: PersistPlayerPositionsUseCase,
  ) {}

  /**
   * Syncs a single player's position by external person ID
   */
  async syncPlayerPositionById(
    externalPlayerId: number | string,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncPlayerPositionResult> {
    if (
      externalPlayerId === null ||
      externalPlayerId === undefined ||
      String(externalPlayerId).trim() === ''
    ) {
      throw new BadRequestException('Player external ID is required');
    }

    const extIdStr = String(externalPlayerId).trim();
    this.logger.log(`[Sync] Extracting position for player ID: ${extIdStr}`);

    // 1. EXTRACT: Call external football API for player detail
    const rawPlayer = await this.footballApiClient.getPlayerById(extIdStr);

    // 2. TRANSFORM: Map provider position string
    const transformed = FootballDataPlayerPositionMapper.toTransformedPosition(
      extIdStr,
      rawPlayer?.position,
      provider,
    );

    if (!transformed) {
      this.logger.log(
        `[Sync] No valid position found for player ID: ${extIdStr} (raw: "${rawPlayer?.position}")`,
      );
      return {
        externalPlayerId: extIdStr,
        playerId: null,
        positionCode: null,
        isPrimary: false,
        persistedPosition: null,
        status: 'NO_POSITION',
      };
    }

    // 3. LOAD: Persist position into PostgreSQL
    const persisted = await this.persistPlayerPositionsUseCase.execute(transformed);

    this.logger.log(
      `[Sync] Successfully synced position "${persisted.positionCode}" (primary: ${persisted.isPrimary}) for player ID: ${extIdStr}`,
    );

    return {
      externalPlayerId: extIdStr,
      playerId: persisted.playerId,
      positionCode: persisted.positionCode,
      isPrimary: persisted.isPrimary,
      persistedPosition: persisted.persistedPosition,
      status: 'SYNCED',
    };
  }

  /**
   * Syncs all player positions for a team squad
   */
  async syncPlayerPositionsByTeam(
    teamId: number | string,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncPlayerPositionsBatchResult> {
    if (teamId === null || teamId === undefined || String(teamId).trim() === '') {
      throw new BadRequestException('Team ID is required for syncing squad positions');
    }

    const teamExtIdStr = String(teamId).trim();
    const numericTeamId = typeof teamId === 'number' ? teamId : parseInt(teamExtIdStr, 10);
    this.logger.log(`[Sync] Fetching squad positions for team ID: ${teamExtIdStr}`);

    // 1. EXTRACT: Get squad players
    const listDto = await this.footballApiClient.getPlayers({
      teamId: !isNaN(numericTeamId) ? numericTeamId : undefined,
    });
    const rawPlayers = listDto.players || [];

    const results: SyncPlayerPositionResult[] = [];
    const errors: Array<{ externalPlayerId: string; error: string }> = [];
    let skippedCount = 0;

    this.logger.log(
      `[Sync] Found ${rawPlayers.length} squad members for team ${teamExtIdStr}`,
    );

    for (const raw of rawPlayers) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const playerExtIdStr = String(raw.id);

      try {
        const transformed = FootballDataPlayerPositionMapper.toTransformedPosition(
          playerExtIdStr,
          raw.position,
          provider,
        );

        if (!transformed) {
          skippedCount++;
          results.push({
            externalPlayerId: playerExtIdStr,
            playerId: null,
            positionCode: null,
            isPrimary: false,
            persistedPosition: null,
            status: 'NO_POSITION',
          });
          continue;
        }

        const persisted = await this.persistPlayerPositionsUseCase.execute(transformed);
        results.push({
          externalPlayerId: playerExtIdStr,
          playerId: persisted.playerId,
          positionCode: persisted.positionCode,
          isPrimary: persisted.isPrimary,
          persistedPosition: persisted.persistedPosition,
          status: 'SYNCED',
        });
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync position for player ${playerExtIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalPlayerId: playerExtIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: rawPlayers.length,
      successful: results.filter((r) => r.status === 'SYNCED').length,
      skipped: skippedCount,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Syncs player positions list with error isolation
   */
  async syncPlayerPositions(
    params?: GetPlayersParams,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncPlayerPositionsBatchResult> {
    this.logger.log('[Sync] Fetching players list for position sync...');

    const listDto = await this.footballApiClient.getPlayers(params);
    const rawPlayers = listDto.players || [];

    const results: SyncPlayerPositionResult[] = [];
    const errors: Array<{ externalPlayerId: string; error: string }> = [];
    let skippedCount = 0;

    this.logger.log(`[Sync] Found ${rawPlayers.length} players to process for positions`);

    for (const raw of rawPlayers) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const playerExtIdStr = String(raw.id);

      try {
        const syncResult = await this.syncPlayerPositionById(raw.id, provider);
        if (syncResult.status === 'NO_POSITION') {
          skippedCount++;
        }
        results.push(syncResult);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync position for player ${playerExtIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalPlayerId: playerExtIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: rawPlayers.length,
      successful: results.filter((r) => r.status === 'SYNCED').length,
      skipped: skippedCount,
      failed: errors.length,
      results,
      errors,
    };
  }
}
