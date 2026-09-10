import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  PLAYER_TEAM_HISTORY_WRITE_REPOSITORY,
  PlayerTeamHistoryWriteRepository,
} from '../ports/player-team-history-write.repository';
import {
  PLAYER_WRITE_REPOSITORY,
  PlayerWriteRepository,
} from '../ports/player-write.repository';
import {
  TEAM_WRITE_REPOSITORY,
  TeamWriteRepository,
} from '../../../teams/application/ports/team-write.repository';
import { PlayerTeamHistoryOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { TransformedPlayerTeamHistory } from '../../../external-football/domain/models/transformed-player-team-history.model';

export interface PersistPlayerTeamHistoryInput {
  playerId?: string;
  playerExternalId?: string;
  teamId?: string;
  teamExternalId?: string;
  externalProvider?: string;
  startDate?: string | null;
  endDate?: string | null;
  shirtNumber?: number | null;
  isCurrent?: boolean;
}

export interface PersistPlayerTeamHistoryResult {
  playerId: string;
  teamId: string;
  startDate: string | null;
  endDate: string | null;
  shirtNumber: number | null;
  isCurrent: boolean;
  persistedHistory: PlayerTeamHistoryOrmEntity;
}

@Injectable()
export class PersistPlayerTeamHistoryUseCase {
  constructor(
    @Inject(PLAYER_TEAM_HISTORY_WRITE_REPOSITORY)
    private readonly playerTeamHistoryWriteRepository: PlayerTeamHistoryWriteRepository,
    @Inject(PLAYER_WRITE_REPOSITORY)
    private readonly playerWriteRepository: PlayerWriteRepository,
    @Inject(TEAM_WRITE_REPOSITORY)
    private readonly teamWriteRepository: TeamWriteRepository,
  ) {}

  /**
   * Persists a single team history record for a player, resolving internal UUIDs for Player and Team
   */
  async execute(
    input: PersistPlayerTeamHistoryInput | TransformedPlayerTeamHistory,
  ): Promise<PersistPlayerTeamHistoryResult> {
    if (!input) {
      throw new BadRequestException('Input is required');
    }

    const provider =
      (input as TransformedPlayerTeamHistory).externalProvider ||
      (input as PersistPlayerTeamHistoryInput).externalProvider ||
      'FOOTBALL_DATA_ORG';

    // 1. Resolve internal Player UUID
    let internalPlayerId: string | null =
      (input as PersistPlayerTeamHistoryInput).playerId || null;

    if (!internalPlayerId) {
      const playerExtId =
        (input as TransformedPlayerTeamHistory).playerExternalId ||
        (input as PersistPlayerTeamHistoryInput).playerExternalId;

      if (!playerExtId || String(playerExtId).trim() === '') {
        throw new BadRequestException(
          'Either playerId or playerExternalId is required',
        );
      }

      const playerEntity =
        await this.playerWriteRepository.findByExternalIdentity(
          provider,
          String(playerExtId).trim(),
        );

      if (!playerEntity) {
        throw new NotFoundException(
          `Player with external ID "${playerExtId}" and provider "${provider}" not found in database. Sync player first.`,
        );
      }

      internalPlayerId = playerEntity.id;
    }

    // 2. Resolve internal Team UUID
    let internalTeamId: string | null =
      (input as PersistPlayerTeamHistoryInput).teamId || null;

    if (!internalTeamId) {
      const teamExtId =
        (input as TransformedPlayerTeamHistory).teamExternalId ||
        (input as PersistPlayerTeamHistoryInput).teamExternalId;

      if (!teamExtId || String(teamExtId).trim() === '') {
        throw new BadRequestException(
          'Either teamId or teamExternalId is required',
        );
      }

      const teamEntity = await this.teamWriteRepository.findByExternalIdentity(
        provider,
        String(teamExtId).trim(),
      );

      if (!teamEntity) {
        throw new NotFoundException(
          `Team with external ID "${teamExtId}" and provider "${provider}" not found in database. Sync team first.`,
        );
      }

      internalTeamId = teamEntity.id;
    }

    const startDate = input.startDate ? String(input.startDate).trim() : null;
    const endDate = input.endDate ? String(input.endDate).trim() : null;
    const shirtNumber =
      input.shirtNumber !== null && input.shirtNumber !== undefined
        ? Number(input.shirtNumber)
        : null;
    const isCurrent = Boolean(input.isCurrent);

    // 3. Persist history via repository
    const persisted = await this.playerTeamHistoryWriteRepository.upsert({
      playerId: internalPlayerId,
      teamId: internalTeamId,
      startDate,
      endDate,
      shirtNumber,
      isCurrent,
    });

    return {
      playerId: internalPlayerId,
      teamId: internalTeamId,
      startDate: persisted.startDate,
      endDate: persisted.endDate,
      shirtNumber: persisted.shirtNumber,
      isCurrent: persisted.isCurrent,
      persistedHistory: persisted,
    };
  }

  /**
   * Persists multiple team history records for a player
   */
  async executeMany(
    inputs: Array<PersistPlayerTeamHistoryInput | TransformedPlayerTeamHistory>,
  ): Promise<PersistPlayerTeamHistoryResult[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }

    const results: PersistPlayerTeamHistoryResult[] = [];
    for (const item of inputs) {
      const res = await this.execute(item);
      results.push(res);
    }

    return results;
  }
}
