import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import { SquadNotFoundError } from '../../domain/errors/squad.errors';

export interface DeleteSquadInput {
  id: string;
  ownerId: string;
}

@Injectable()
export class DeleteSquadUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
  ) {}

  async execute(input: DeleteSquadInput): Promise<void> {
    const squad = await this.squadRepository.findById(input.id);
    if (!squad || squad.getOwnerId() !== input.ownerId) {
      throw new SquadNotFoundError(input.id);
    }

    await this.squadRepository.delete(input.id);
  }
}
