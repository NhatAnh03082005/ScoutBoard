import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  PLAYER_POSITION_WRITE_REPOSITORY,
  PlayerPositionWriteRepository,
} from '../ports/player-position-write.repository';
import {
  PLAYER_WRITE_REPOSITORY,
  PlayerWriteRepository,
} from '../ports/player-write.repository';
import { PlayerPositionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { TransformedPlayerPosition } from '../../../external-football/domain/models/transformed-player-position.model';

export interface PersistPlayerPositionInput {
  playerId?: string;
  playerExternalId?: string;
  externalProvider?: string;
  positionCode: string;
  isPrimary?: boolean;
}

export interface PersistPlayerPositionResult {
  playerId: string;
  positionCode: string;
  isPrimary: boolean;
  persistedPosition: PlayerPositionOrmEntity;
}

@Injectable()
export class PersistPlayerPositionsUseCase {
  constructor(
    @Inject(PLAYER_POSITION_WRITE_REPOSITORY)
    private readonly playerPositionWriteRepository: PlayerPositionWriteRepository,
    @Inject(PLAYER_WRITE_REPOSITORY)
    private readonly playerWriteRepository: PlayerWriteRepository,
  ) {}

  /**
   * Persists a single position for a player (resolving internal UUID if external identity is given)
   */
  async execute(
    input: PersistPlayerPositionInput | TransformedPlayerPosition,
  ): Promise<PersistPlayerPositionResult> {
    if (!input) {
      throw new BadRequestException('Input is required');
    }

    if (!input.positionCode || String(input.positionCode).trim() === '') {
      throw new BadRequestException('Position code is required');
    }

    const posCode = String(input.positionCode).trim().toUpperCase();
    const isPrimary =
      input.isPrimary !== undefined ? Boolean(input.isPrimary) : true;

    // 1. Resolve internal Player UUID
    let internalPlayerId: string | null =
      (input as PersistPlayerPositionInput).playerId || null;

    if (!internalPlayerId) {
      const externalId =
        (input as TransformedPlayerPosition).playerExternalId ||
        (input as PersistPlayerPositionInput).playerExternalId;
      const provider =
        (input as TransformedPlayerPosition).externalProvider ||
        (input as PersistPlayerPositionInput).externalProvider ||
        'FOOTBALL_DATA_ORG';

      if (!externalId || String(externalId).trim() === '') {
        throw new BadRequestException(
          'Either playerId or playerExternalId is required',
        );
      }

      const playerEntity =
        await this.playerWriteRepository.findByExternalIdentity(
          provider,
          String(externalId).trim(),
        );

      if (!playerEntity) {
        throw new NotFoundException(
          `Player with external ID "${externalId}" and provider "${provider}" not found in database. Sync player first.`,
        );
      }

      internalPlayerId = playerEntity.id;
    }

    // 2. Persist position via repository
    const persisted = await this.playerPositionWriteRepository.upsert(
      internalPlayerId,
      posCode,
      isPrimary,
    );

    return {
      playerId: internalPlayerId,
      positionCode: posCode,
      isPrimary: persisted.isPrimary,
      persistedPosition: persisted,
    };
  }

  /**
   * Persists multiple positions for players
   */
  async executeMany(
    inputs: Array<PersistPlayerPositionInput | TransformedPlayerPosition>,
  ): Promise<PersistPlayerPositionResult[]> {
    if (!inputs || inputs.length === 0) {
      return [];
    }

    const results: PersistPlayerPositionResult[] = [];
    for (const item of inputs) {
      const res = await this.execute(item);
      results.push(res);
    }

    return results;
  }
}
