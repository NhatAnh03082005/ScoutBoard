import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

export const PLAYER_READ_REPOSITORY = Symbol('PLAYER_READ_REPOSITORY');

export interface SearchPlayersQuery {
  search?: string;
  teamId?: string;
  position?: string;
  limit?: number;
  offset?: number;
}

export interface PlayerReadRepository {
  findById(id: string): Promise<PlayerOrmEntity | null>;
  search(
    query: SearchPlayersQuery,
  ): Promise<{ items: PlayerOrmEntity[]; total: number }>;
}
