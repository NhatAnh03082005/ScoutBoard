import { ShortlistPlayer } from '../../../../domain/entities/shortlist-player';
import { ShortlistPlayerOrmEntity } from '../entities/shortlist-player.orm-entity';

export class ShortlistPlayerMapper {
  static toDomain(entity: ShortlistPlayerOrmEntity): ShortlistPlayer {
    return new ShortlistPlayer(
      entity.id,
      entity.shortlistId,
      entity.playerId,
      entity.note,
      entity.addedAt,
    );
  }

  static toPersistence(domain: ShortlistPlayer): ShortlistPlayerOrmEntity {
    const entity = new ShortlistPlayerOrmEntity();
    entity.id = domain.id;
    entity.shortlistId = domain.shortlistId;
    entity.playerId = domain.playerId;
    entity.note = domain.getNote();
    return entity;
  }
}
