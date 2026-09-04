import { Injectable, Inject } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';

@Injectable()
export class GetAvailablePositionsUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(): Promise<string[]> {
    return this.playerReadRepository.getDistinctPositions();
  }
}
