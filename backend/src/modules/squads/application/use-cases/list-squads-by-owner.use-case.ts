import { Injectable, Inject } from '@nestjs/common';
import {
  SQUAD_REPOSITORY,
  SquadRepository,
} from '../../domain/repositories/squad.repository';
import { Squad } from '../../domain/entities/squad';

@Injectable()
export class ListSquadsByOwnerUseCase {
  constructor(
    @Inject(SQUAD_REPOSITORY)
    private readonly squadRepository: SquadRepository,
  ) {}

  async execute(ownerId: string): Promise<Squad[]> {
    return this.squadRepository.findByOwner(ownerId);
  }
}
