import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TransformedPlayer } from '../../../external-football/domain/models/transformed-player.model';

export const PLAYER_WRITE_REPOSITORY = Symbol('PLAYER_WRITE_REPOSITORY');

export interface PlayerWriteRepository {
  findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<PlayerOrmEntity | null>;

  upsert(
    player: TransformedPlayer,
    teamId?: string | null,
  ): Promise<PlayerOrmEntity>;

  upsertMany(
    players: TransformedPlayer[],
    teamId?: string | null,
  ): Promise<PlayerOrmEntity[]>;
}
