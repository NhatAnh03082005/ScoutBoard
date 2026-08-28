import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import { Squad, SquadVisibility, FormationCode } from '../../domain/entities/squad';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

export interface UpdateSquadInput {
  id: string;
  ownerId: string;
  name?: string;
  formationCode?: FormationCode | string;
  seasonId?: string | null;
  description?: string | null;
  visibility?: SquadVisibility;
}

@Injectable()
export class UpdateSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
  ) {}

  async execute(input: UpdateSquadInput): Promise<Squad> {
    const squad = await this.squadRepository.findById(input.id);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.id);
    }

    if (input.name !== undefined) {
      squad.updateName(input.name);
    }

    if (input.formationCode !== undefined) {
      squad.updateFormationCode(input.formationCode);
    }

    if (input.seasonId !== undefined) {
      squad.updateSeasonId(input.seasonId);
    }

    if (input.description !== undefined) {
      squad.updateDescription(input.description);
    }

    if (input.visibility !== undefined) {
      squad.updateVisibility(input.visibility);
    }

    return this.squadRepository.save(squad);
  }
}
