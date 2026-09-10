import {
  Squad,
  SquadVisibility,
  FormationCode,
} from '../../../../domain/entities/squad';
import { SquadOrmEntity } from '../entities/squad.orm-entity';

export class SquadMapper {
  static toDomain(entity: SquadOrmEntity): Squad {
    return new Squad(
      entity.id,
      entity.ownerId,
      entity.name,
      entity.formationCode,
      entity.seasonId,
      entity.description,
      entity.visibility as SquadVisibility,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toPersistence(domain: Squad): SquadOrmEntity {
    const entity = new SquadOrmEntity();
    entity.id = domain.id;
    entity.ownerId = domain.getOwnerId();
    entity.seasonId = domain.getSeasonId();
    entity.name = domain.getName();
    entity.formationCode = domain.getFormationCode();
    entity.description = domain.getDescription();
    entity.visibility = domain.getVisibility();
    return entity;
  }
}
