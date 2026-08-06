import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PreferredFoot } from '../../domain/enums/preferred-foot.enum';

export const PLAYER_READ_REPOSITORY = Symbol('PLAYER_READ_REPOSITORY');

export interface SearchPlayersQuery {
  search?: string;
  preferredFoot?: PreferredFoot;
  nationality?: string;
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
