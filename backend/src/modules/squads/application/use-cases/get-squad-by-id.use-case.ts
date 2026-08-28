import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

export interface GetSquadByIdInput {
  id: string;
  ownerId: string;
}

@Injectable()
export class GetSquadByIdUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
  ) {}

  async execute(input: GetSquadByIdInput): Promise<Squad> {
    const squad = await this.squadRepository.findById(input.id);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.id);
    }
    return squad;
  }
}
