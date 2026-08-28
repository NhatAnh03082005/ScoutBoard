import { EntityManager } from 'typeorm';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-position.orm-entity';

export const PLAYER_POSITION_WRITE_REPOSITORY = Symbol(
  'PLAYER_POSITION_WRITE_REPOSITORY',
);

export interface UpsertPlayerPositionItem {
  playerId: string;
  positionCode: string;
  isPrimary: boolean;
}

export interface PlayerPositionWriteRepository {
  findByPlayerAndPosition(
    playerId: string,
    positionCode: string,
  ): Promise<PlayerPositionOrmEntity | null>;

  findByPlayerId(playerId: string): Promise<PlayerPositionOrmEntity[]>;

  upsert(
    playerId: string,
    positionCode: string,
    isPrimary: boolean,
  ): Promise<PlayerPositionOrmEntity>;

  upsertMany(
    positions: UpsertPlayerPositionItem[],
  ): Promise<PlayerPositionOrmEntity[]>;

  updatePrimaryPosition(
    manager: EntityManager,
    playerId: string,
    positionCode: string,
  ): Promise<PlayerOrmEntity>;
}
