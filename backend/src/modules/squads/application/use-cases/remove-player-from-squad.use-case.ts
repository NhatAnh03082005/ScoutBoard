import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import {
  SQUAD_PLAYER_REPOSITORY,
  SquadPlayerRepository,
} from '../../domain/repositories/squad-player.repository';
import {
  SquadNotFoundError,
  PlayerNotInSquadError,
} from '../../domain/errors/squad.errors';

export interface RemovePlayerFromSquadInput {
  squadId: string;
  ownerId: string;
  playerId: string;
}

@Injectable()
export class RemovePlayerFromSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
    @Inject(SQUAD_PLAYER_REPOSITORY)
    private readonly squadPlayerRepository: SquadPlayerRepository,
  ) {}

  async execute(input: RemovePlayerFromSquadInput): Promise<void> {
    const squad = await this.squadRepository.findById(input.squadId);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.squadId);
    }

    const squadPlayer = await this.squadPlayerRepository.findBySquadAndPlayer(
      input.squadId,
      input.playerId,
    );
    if (!squadPlayer) {
      throw new PlayerNotInSquadError(input.playerId, input.squadId);
    }

    await this.squadPlayerRepository.removePlayer(input.squadId, input.playerId);
  }
}
