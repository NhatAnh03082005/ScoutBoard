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
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../../../players/application/ports/player-read.repository';
import {
  SquadPlayer,
  SquadPlayerRole,
} from '../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotFoundError,
  PlayerAlreadyInSquadError,
  SquadStarterSlotAlreadyOccupiedError,
  SquadCaptainAlreadyAssignedError,
  CaptainMustBeStarterError,
} from '../../domain/errors/squad.errors';

export interface AddPlayerToSquadInput {
  squadId: string;
  ownerId: string;
  playerId: string;
  slotCode?: string | null;
  role: SquadPlayerRole | string;
  isCaptain?: boolean;
  displayOrder?: number | null;
}

@Injectable()
export class AddPlayerToSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
    @Inject(SQUAD_PLAYER_REPOSITORY)
    private readonly squadPlayerRepository: SquadPlayerRepository,
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(input: AddPlayerToSquadInput): Promise<SquadPlayer> {
    const squad = await this.squadRepository.findById(input.squadId);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.squadId);
    }

    const player = await this.playerReadRepository.findById(input.playerId);
    if (!player) {
      throw new PlayerNotFoundError(input.playerId);
    }

    const existingPlayerInSquad =
      await this.squadPlayerRepository.findBySquadAndPlayer(
        input.squadId,
        input.playerId,
      );
    if (existingPlayerInSquad) {
      throw new PlayerAlreadyInSquadError(input.playerId, input.squadId);
    }

    if (input.role === 'STARTER' && input.slotCode) {
      const occupiedSlot =
        await this.squadPlayerRepository.findStarterBySlotCode(
          input.squadId,
          input.slotCode,
        );
      if (occupiedSlot) {
        throw new SquadStarterSlotAlreadyOccupiedError(
          input.slotCode,
          input.squadId,
        );
      }
    }

    if (input.isCaptain) {
      if (input.role !== 'STARTER') {
        throw new CaptainMustBeStarterError();
      }
      const existingCaptain =
        await this.squadPlayerRepository.findCaptainBySquadId(input.squadId);
      if (existingCaptain) {
        throw new SquadCaptainAlreadyAssignedError(input.squadId);
      }
    }

    return this.squadPlayerRepository.addPlayer({
      squadId: input.squadId,
      playerId: input.playerId,
      slotCode: input.slotCode,
      role: input.role,
      isCaptain: input.isCaptain,
      displayOrder: input.displayOrder,
    });
  }
}
