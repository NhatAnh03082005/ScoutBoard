import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import {
  Squad,
  SquadVisibility,
  FormationCode,
} from '../../domain/entities/squad';

export interface CreateSquadInput {
  ownerId: string;
  name: string;
  formationCode: FormationCode | string;
  seasonId?: string | null;
  description?: string | null;
  visibility?: SquadVisibility;
}

@Injectable()
export class CreateSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
  ) {}

  async execute(input: CreateSquadInput): Promise<Squad> {
    return this.squadRepository.create({
      ownerId: input.ownerId,
      name: input.name,
      formationCode: input.formationCode,
      seasonId: input.seasonId,
      description: input.description,
      visibility: input.visibility,
    });
  }
}
