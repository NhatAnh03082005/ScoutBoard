import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PlayerPositionWriteRepository } from 'src/modules/players/application/ports/player-position-write.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../entities/player-position.orm-entity';

@Injectable()
export class TypeOrmPlayerPositionWriteRepository implements PlayerPositionWriteRepository {
  async updatePrimaryPosition(
    manager: EntityManager,
    playerId: string,
    positionCode: string,
  ): Promise<PlayerOrmEntity> {
    const playerRepository = manager.getRepository(PlayerOrmEntity);
    const positionRepository = manager.getRepository(PlayerPositionOrmEntity);

    const player = await playerRepository
      .createQueryBuilder('player')
      .setLock('pessimistic_write')
      .where('player.id = :playerId', { playerId })
      .getOne();

    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    await positionRepository
      .createQueryBuilder()
      .update(PlayerPositionOrmEntity)
      .set({ isPrimary: false })
      .where('player_id = :playerId', { playerId })
      .execute();

    let target = await positionRepository.findOne({
      where: { playerId, positionCode },
    });

    if (!target) {
      target = positionRepository.create({
        playerId,
        positionCode,
        isPrimary: true,
      });
    } else {
      target.isPrimary = true;
    }

    await positionRepository.save(target);

    player.primaryPosition = positionCode;
    return playerRepository.save(player);
  }
}
