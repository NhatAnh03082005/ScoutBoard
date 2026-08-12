import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

@Injectable()
export class GetPlayerByIdUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(id: string): Promise<PlayerOrmEntity> {
    const player = await this.playerReadRepository.findById(id);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }
    return player;
  }
}
