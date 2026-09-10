import {
  SquadPlayer,
  SquadPlayerRole,
} from '../../../../domain/entities/squad-player';
import { SquadPlayerOrmEntity } from '../entities/squad-player.orm-entity';

export class SquadPlayerMapper {
  static toDomain(entity: SquadPlayerOrmEntity): SquadPlayer {
    return new SquadPlayer(
      entity.id,
      entity.squadId,
      entity.playerId,
      entity.slotCode,
      entity.role,
      entity.isCaptain,
      entity.displayOrder,
      entity.addedAt,
    );
  }

  static toPersistence(domain: SquadPlayer): SquadPlayerOrmEntity {
    const entity = new SquadPlayerOrmEntity();
    entity.id = domain.id;
    entity.squadId = domain.squadId;
    entity.playerId = domain.playerId;
    entity.slotCode = domain.getSlotCode();
    entity.role = domain.getRole();
    entity.isCaptain = domain.getIsCaptain();
    entity.displayOrder = domain.getDisplayOrder();
    return entity;
  }
}
