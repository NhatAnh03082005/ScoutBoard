import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import {
  SQUAD_PLAYER_REPOSITORY,
  SquadPlayerRepository,
} from '../../domain/repositories/squad-player.repository';
import { SquadPlayer, SquadPlayerRole } from '../../domain/entities/squad-player';
import {
  SquadNotFoundError,
  PlayerNotInSquadError,
  SquadStarterSlotAlreadyOccupiedError,
  CaptainMustBeStarterError,
} from '../../domain/errors/squad.errors';

export interface UpdateSquadPlayerInput {
  squadId: string;
  ownerId: string;
  playerId: string;
  slotCode?: string | null;
  role?: SquadPlayerRole | string;
  isCaptain?: boolean;
  displayOrder?: number | null;
}

@Injectable()
export class UpdateSquadPlayerUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
    @Inject(SQUAD_PLAYER_REPOSITORY)
    private readonly squadPlayerRepository: SquadPlayerRepository,
  ) {}

  async execute(input: UpdateSquadPlayerInput): Promise<SquadPlayer> {
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

    const nextRole = input.role !== undefined ? input.role : squadPlayer.getRole();
    const nextSlotCode = input.slotCode !== undefined ? input.slotCode : squadPlayer.getSlotCode();
    
    let nextIsCaptain: boolean;
    if (input.isCaptain !== undefined) {
      nextIsCaptain = input.isCaptain;
    } else if (input.role === 'SUBSTITUTE') {
      nextIsCaptain = false;
    } else {
      nextIsCaptain = squadPlayer.getIsCaptain();
    }

    // Check slot occupation for starters
    if (nextRole === 'STARTER' && nextSlotCode) {
      const occupied = await this.squadPlayerRepository.findStarterBySlotCode(
        input.squadId,
        nextSlotCode,
      );
      if (occupied && occupied.playerId !== input.playerId) {
        throw new SquadStarterSlotAlreadyOccupiedError(nextSlotCode, input.squadId);
      }
    }

    // Check and switch captain rules
    if (nextIsCaptain) {
      if (nextRole !== 'STARTER') {
        throw new CaptainMustBeStarterError();
      }
      const existingCaptain = await this.squadPlayerRepository.findCaptainBySquadId(
        input.squadId,
      );
      if (existingCaptain && existingCaptain.playerId !== input.playerId) {
        // Switch captaincy cleanly: unset the previous captain
        existingCaptain.setCaptain(false);
        await this.squadPlayerRepository.save(existingCaptain);
      }
    }

    if (input.role !== undefined) {
      squadPlayer.updateRole(input.role);
    }

    if (input.slotCode !== undefined) {
      squadPlayer.updateSlotCode(input.slotCode);
    }

    squadPlayer.setCaptain(nextIsCaptain);

    if (input.displayOrder !== undefined) {
      squadPlayer.updateDisplayOrder(input.displayOrder);
    }

    return this.squadPlayerRepository.save(squadPlayer);
  }
}
