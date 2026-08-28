import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataTeamMapper } from '../../../external-football/infrastructure/mappers/football-data-team.mapper';
import {
  PersistTeamWithSquadUseCase,
  PersistTeamWithSquadResult,
} from '../use-cases/persist-team-with-squad.use-case';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

export interface SyncTeamResult {
  externalId: string;
  teamId: string;
  teamName: string;
  playersPersisted: number;
  persistedTeam: TeamOrmEntity;
  persistedPlayers: PlayerOrmEntity[];
}

export interface SyncTeamsBatchResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: SyncTeamResult[];
  errors: Array<{ externalId: string; error: string }>;
}

@Injectable()
export class TeamSyncService {
  private readonly logger = new Logger(TeamSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistTeamWithSquadUseCase: PersistTeamWithSquadUseCase,
  ) {}

  /**
   * Syncs a single team and its squad from external API to PostgreSQL
   */
  async syncTeamById(id: number | string): Promise<SyncTeamResult> {
    if (id === null || id === undefined || String(id).trim() === '') {
      throw new BadRequestException('Team ID is required for sync');
    }

    this.logger.log(`[Sync] Extracting team data for ID: ${id}`);

    // 1. EXTRACT: Fetch team detail with squad
    const rawDetail = await this.footballApiClient.getTeamById(id);

    // 2. TRANSFORM: Map raw DTO to clean domain model
    const transformed = FootballDataTeamMapper.toTransformedTeam(rawDetail);

    // 3. LOAD: Persist team and squad into PostgreSQL
    const persistResult: PersistTeamWithSquadResult =
      await this.persistTeamWithSquadUseCase.execute(transformed);

    this.logger.log(
      `[Sync] Successfully synced team "${transformed.name}" (ID: ${persistResult.teamId}) with ${persistResult.playersPersisted} squad players`,
    );

    return {
      externalId: transformed.externalId,
      teamId: persistResult.teamId,
      teamName: persistResult.team.name,
      playersPersisted: persistResult.playersPersisted,
      persistedTeam: persistResult.team,
      persistedPlayers: persistResult.players,
    };
  }

  /**
   * Syncs all teams in a given competition (e.g. "PL")
   */
  async syncTeamsByCompetition(
    competitionCode: string,
    season?: number,
  ): Promise<SyncTeamsBatchResult> {
    if (!competitionCode || competitionCode.trim() === '') {
      throw new BadRequestException('Competition code is required for team sync');
    }

    this.logger.log(`[Sync] Fetching teams for competition: ${competitionCode}`);

    // 1. EXTRACT: Get team list in competition
    const listDto = await this.footballApiClient.getTeams({
      competitionCode: competitionCode.trim(),
      season,
    });

    const teams = listDto.teams || [];
    const results: SyncTeamResult[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    this.logger.log(`[Sync] Found ${teams.length} teams in competition ${competitionCode}`);

    for (const team of teams) {
      if (!team || team.id === null || team.id === undefined) {
        continue;
      }
      const externalIdStr = String(team.id);
      try {
        const syncResult = await this.syncTeamById(team.id);
        results.push(syncResult);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync team ${externalIdStr} (${team.name}): ${errorMsg}`,
        );
        errors.push({
          externalId: externalIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: teams.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
