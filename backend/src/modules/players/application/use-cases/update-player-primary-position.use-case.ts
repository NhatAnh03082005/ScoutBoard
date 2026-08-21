import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PLAYER_POSITION_WRITE_REPOSITORY,
  PlayerPositionWriteRepository,
} from '../ports/player-position-write.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

export interface UpdatePlayerPrimaryPositionInput {
  playerId: string;
  positionCode: string;
}

@Injectable()
export class UpdatePlayerPrimaryPositionUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(PLAYER_POSITION_WRITE_REPOSITORY)
    private readonly playerPositionWriteRepository: PlayerPositionWriteRepository,
  ) {}

  execute(input: UpdatePlayerPrimaryPositionInput): Promise<PlayerOrmEntity> {
    return this.dataSource.transaction((manager) =>
      this.playerPositionWriteRepository.updatePrimaryPosition(
        manager,
        input.playerId,
        input.positionCode,
      ),
    );
  }
}
