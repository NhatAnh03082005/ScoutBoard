import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import {
  SQUAD_PLAYER_REPOSITORY,
  SquadPlayerRepository,
} from '../../domain/repositories/squad-player.repository';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

export interface ListPlayersInSquadInput {
  squadId: string;
  ownerId: string;
}

@Injectable()
export class ListPlayersInSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
    @Inject(SQUAD_PLAYER_REPOSITORY)
    private readonly squadPlayerRepository: SquadPlayerRepository,
  ) {}

  async execute(input: ListPlayersInSquadInput): Promise<any[]> {
    const squad = await this.squadRepository.findById(input.squadId);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.squadId);
    }

    return this.squadPlayerRepository.findPlayersWithDetailsBySquadId(input.squadId);
  }
}
