import { Shortlist, ShortlistVisibility } from '../../../../domain/entities/shortlist';
import { ShortlistOrmEntity } from '../entities/shortlist.orm-entity';

export class ShortlistMapper {
  static toDomain(entity: ShortlistOrmEntity): Shortlist {
    return new Shortlist(
      entity.id,
      entity.ownerId,
      entity.name,
      entity.description,
      entity.visibility as ShortlistVisibility,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toPersistence(domain: Shortlist): ShortlistOrmEntity {
    const entity = new ShortlistOrmEntity();
    entity.id = domain.id;
    entity.ownerId = domain.getOwnerId();
    entity.name = domain.getName();
    entity.description = domain.getDescription();
    entity.visibility = domain.getVisibility();
    return entity;
  }
}
