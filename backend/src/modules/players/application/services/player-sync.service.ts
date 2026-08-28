import { Injectable, Inject, Logger, BadRequestException, Optional } from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
  GetPlayersParams,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataPlayerMapper } from '../../../external-football/infrastructure/mappers/football-data-player.mapper';
import { PersistPlayerUseCase } from '../use-cases/persist-player.use-case';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import {
  TEAM_WRITE_REPOSITORY,
  TeamWriteRepository,
} from '../../../teams/application/ports/team-write.repository';

export interface SyncPlayerResult {
  externalId: string;
  playerId: string;
  playerName: string;
  currentTeamId: string | null;
  persistedPlayer: PlayerOrmEntity;
}

export interface SyncPlayersBatchResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: SyncPlayerResult[];
  errors: Array<{ externalId: string; error: string }>;
}

@Injectable()
export class PlayerSyncService {
  private readonly logger = new Logger(PlayerSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistPlayerUseCase: PersistPlayerUseCase,
    @Optional()
    @Inject(TEAM_WRITE_REPOSITORY)
    private readonly teamWriteRepository?: TeamWriteRepository,
  ) {}

  /**
   * Syncs a single player by external person ID
   */
  async syncPlayerById(id: number | string): Promise<SyncPlayerResult> {
    if (id === null || id === undefined || String(id).trim() === '') {
      throw new BadRequestException('Player ID is required for sync');
    }

    this.logger.log(`[Sync] Extracting player data for ID: ${id}`);

    // 1. EXTRACT: Call external football API for player
    const rawDetail = await this.footballApiClient.getPlayerById(id);

    // 2. TRANSFORM: Map raw DTO to clean domain model
    const transformed = FootballDataPlayerMapper.toTransformedPlayer(rawDetail);

    // 3. Resolve team internal UUID if current team external ID is available
    let internalTeamId: string | null = null;
    if (transformed.currentTeamExternalId && this.teamWriteRepository) {
      const teamEntity = await this.teamWriteRepository.findByExternalIdentity(
        transformed.externalProvider,
        transformed.currentTeamExternalId,
      );
      if (teamEntity) {
        internalTeamId = teamEntity.id;
      }
    }

    // 4. LOAD: Persist player into PostgreSQL
    const persisted = await this.persistPlayerUseCase.execute(
      transformed,
      internalTeamId,
    );

    this.logger.log(
      `[Sync] Successfully synced player "${transformed.name}" (ID: ${persisted.id})`,
    );

    return {
      externalId: transformed.externalId,
      playerId: persisted.id,
      playerName: persisted.name,
      currentTeamId: persisted.currentTeamId,
      persistedPlayer: persisted,
    };
  }

  /**
   * Syncs all players belonging to a team (squad)
   */
  async syncPlayersByTeam(teamId: number | string): Promise<SyncPlayersBatchResult> {
    if (teamId === null || teamId === undefined || String(teamId).trim() === '') {
      throw new BadRequestException('Team ID is required for syncing team players');
    }

    const teamExtIdStr = String(teamId).trim();
    const numericTeamId = typeof teamId === 'number' ? teamId : parseInt(teamExtIdStr, 10);
    this.logger.log(`[Sync] Fetching squad players for team ID: ${teamExtIdStr}`);

    // 1. EXTRACT: Get players for team
    const listDto = await this.footballApiClient.getPlayers({
      teamId: !isNaN(numericTeamId) ? numericTeamId : undefined,
    });
    const rawPlayers = listDto.players || [];

    // 2. Resolve team internal UUID
    let internalTeamId: string | null = null;
    if (this.teamWriteRepository) {
      const teamEntity = await this.teamWriteRepository.findByExternalIdentity(
        'FOOTBALL_DATA_ORG',
        teamExtIdStr,
      );
      if (teamEntity) {
        internalTeamId = teamEntity.id;
      }
    }

    const results: SyncPlayerResult[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    this.logger.log(`[Sync] Found ${rawPlayers.length} players for team ${teamExtIdStr}`);

    for (const raw of rawPlayers) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const playerExtIdStr = String(raw.id);
      try {
        const transformed = FootballDataPlayerMapper.toTransformedPlayer(
          raw,
          'FOOTBALL_DATA_ORG',
          teamExtIdStr,
        );
        const persisted = await this.persistPlayerUseCase.execute(
          transformed,
          internalTeamId,
        );
        results.push({
          externalId: transformed.externalId,
          playerId: persisted.id,
          playerName: persisted.name,
          currentTeamId: persisted.currentTeamId,
          persistedPlayer: persisted,
        });
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync player ${playerExtIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalId: playerExtIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: rawPlayers.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Syncs players list with error isolation
   */
  async syncPlayers(params?: GetPlayersParams): Promise<SyncPlayersBatchResult> {
    this.logger.log('[Sync] Fetching players list from external API...');

    // 1. EXTRACT: Call external football API for players list
    const listDto = await this.footballApiClient.getPlayers(params);
    const rawPlayers = listDto.players || [];

    const results: SyncPlayerResult[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    this.logger.log(`[Sync] Found ${rawPlayers.length} players to process`);

    for (const raw of rawPlayers) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const externalIdStr = String(raw.id);
      try {
        const syncResult = await this.syncPlayerById(raw.id);
        results.push(syncResult);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync player ${externalIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalId: externalIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: rawPlayers.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
