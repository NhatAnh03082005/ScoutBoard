import {
  Injectable,
  Inject,
  Optional,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  PLAYER_WRITE_REPOSITORY,
  PlayerWriteRepository,
} from '../ports/player-write.repository';
import {
  PLAYER_POSITION_WRITE_REPOSITORY,
  PlayerPositionWriteRepository,
} from '../ports/player-position-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { EnrichedPlayerProfile } from '../../../external-football/infrastructure/mappers/api-football-player.mapper';
import { normalizeToCanonicalPosition } from '../../domain/enums/player-position.enum';

export interface EnrichPlayerProfileInput {
  playerId: string;
  enrichment: EnrichedPlayerProfile;
}

@Injectable()
export class EnrichPlayerProfileUseCase {
  private readonly logger = new Logger(EnrichPlayerProfileUseCase.name);

  constructor(
    @Inject(PLAYER_WRITE_REPOSITORY)
    private readonly playerWriteRepository: PlayerWriteRepository,
    @Optional()
    @Inject(PLAYER_POSITION_WRITE_REPOSITORY)
    private readonly playerPositionWriteRepository?: PlayerPositionWriteRepository,
  ) {}

  /**
   * Enriches an existing PlayerOrmEntity with physical attributes, photo, and detailed position
   * Preserves core provider identity and existing verified data.
   */
  async execute(input: EnrichPlayerProfileInput): Promise<PlayerOrmEntity> {
    if (!input || !input.playerId) {
      throw new NotFoundException('Player ID is required for enrichment');
    }

    const { playerId, enrichment } = input;

    const playerRepo =
      (this.playerWriteRepository as any).playerRepository ||
      (this.playerWriteRepository as any).repository;

    const existing = await playerRepo?.findOne({
      where: { id: playerId },
    });

    if (!existing) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    let modified = false;

    // 1. Photo / Image URL
    if (enrichment.imageUrl && enrichment.imageUrl.trim() !== '') {
      existing.imageUrl = enrichment.imageUrl.trim();
      modified = true;
    }

    // 2. Height
    if (
      typeof enrichment.heightCm === 'number' &&
      enrichment.heightCm > 50 &&
      enrichment.heightCm < 250
    ) {
      existing.heightCm = enrichment.heightCm;
      modified = true;
    }

    // 3. Weight
    if (
      typeof enrichment.weightKg === 'number' &&
      enrichment.weightKg > 30 &&
      enrichment.weightKg < 200
    ) {
      existing.weightKg = enrichment.weightKg;
      modified = true;
    }

    // 4. Preferred Foot
    if (enrichment.preferredFoot && enrichment.preferredFoot.trim() !== '') {
      existing.preferredFoot = enrichment.preferredFoot.trim().toUpperCase();
      modified = true;
    }

    // 5. Shirt Number (only update if existing is null or if new is present)
    if (
      typeof enrichment.shirtNumber === 'number' &&
      enrichment.shirtNumber > 0 &&
      enrichment.shirtNumber < 100
    ) {
      existing.shirtNumber = enrichment.shirtNumber;
      modified = true;
    }

    // 6. Primary Position (normalize to canonical position)
    let positionChanged = false;
    if (
      enrichment.primaryPosition &&
      enrichment.primaryPosition.trim() !== ''
    ) {
      const canonicalPos = normalizeToCanonicalPosition(
        enrichment.primaryPosition,
        {
          preferredFoot: enrichment.preferredFoot || existing.preferredFoot,
        },
      );
      if (canonicalPos && canonicalPos !== existing.primaryPosition) {
        // Do not downgrade an existing detailed tactical position to a generic broad role
        const broadRoles = ['DEF', 'MID', 'FWD'];
        const isExistingDetailed =
          existing.primaryPosition &&
          !broadRoles.includes(existing.primaryPosition);
        if (!(isExistingDetailed && broadRoles.includes(canonicalPos))) {
          existing.primaryPosition = canonicalPos;
          modified = true;
          positionChanged = true;
        }
      }
    }

    // 7. Date of birth
    if (
      enrichment.dateOfBirth &&
      (!existing.dateOfBirth || existing.dateOfBirth !== enrichment.dateOfBirth)
    ) {
      existing.dateOfBirth = enrichment.dateOfBirth;
      modified = true;
    }

    // 8. Nationality
    if (
      enrichment.nationality &&
      (!existing.nationality || existing.nationality !== enrichment.nationality)
    ) {
      existing.nationality = enrichment.nationality.trim();
      modified = true;
    }

    if (modified) {
      existing.dataUpdatedAt = new Date();
      const saved = await ((
        this.playerWriteRepository as any
      ).playerRepository?.save(existing) ?? existing);

      // Synchronize player_positions table if position was modified
      if (
        positionChanged &&
        existing.primaryPosition &&
        this.playerPositionWriteRepository
      ) {
        try {
          await this.playerPositionWriteRepository.upsert(
            existing.id,
            existing.primaryPosition,
            true,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to synchronize player_positions for player ${existing.id}: ${err}`,
          );
        }
      }

      return saved;
    }

    return existing;
  }
}
