import { EntityManager } from 'typeorm';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

export const PLAYER_POSITION_WRITE_REPOSITORY = Symbol(
  'PLAYER_POSITION_WRITE_REPOSITORY',
);

export interface PlayerPositionWriteRepository {
  updatePrimaryPosition(
    manager: EntityManager,
    playerId: string,
    positionCode: string,
  ): Promise<PlayerOrmEntity>;
}
