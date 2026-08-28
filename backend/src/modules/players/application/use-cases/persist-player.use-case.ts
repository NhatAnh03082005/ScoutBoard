import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  PLAYER_WRITE_REPOSITORY,
  PlayerWriteRepository,
} from '../ports/player-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TransformedPlayer } from '../../../external-football/domain/models/transformed-player.model';

@Injectable()
export class PersistPlayerUseCase {
  constructor(
    @Inject(PLAYER_WRITE_REPOSITORY)
    private readonly playerWriteRepository: PlayerWriteRepository,
  ) {}

  async execute(
    input: TransformedPlayer,
    teamId?: string | null,
  ): Promise<PlayerOrmEntity> {
    if (!input) {
      throw new BadRequestException('Transformed player input is required');
    }

    if (!input.externalProvider || String(input.externalProvider).trim() === '') {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!input.name || String(input.name).trim() === '') {
      throw new BadRequestException('Player name is required');
    }

    return this.playerWriteRepository.upsert(input, teamId);
  }

  async executeMany(
    inputs: TransformedPlayer[],
    teamId?: string | null,
  ): Promise<PlayerOrmEntity[]> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return [];
    }

    const validated: TransformedPlayer[] = [];
    for (const item of inputs) {
      if (
        item &&
        item.externalProvider &&
        item.externalId &&
        item.name &&
        String(item.name).trim() !== ''
      ) {
        validated.push(item);
      }
    }

    return this.playerWriteRepository.upsertMany(validated, teamId);
  }
}
