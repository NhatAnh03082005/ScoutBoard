import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  PlayerPositionWriteRepository,
  UpsertPlayerPositionItem,
} from 'src/modules/players/application/ports/player-position-write.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../entities/player-position.orm-entity';

@Injectable()
export class TypeOrmPlayerPositionWriteRepository implements PlayerPositionWriteRepository {
  constructor(
    @InjectRepository(PlayerPositionOrmEntity)
    private readonly positionRepository: Repository<PlayerPositionOrmEntity>,
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
  ) {}

  async findByPlayerAndPosition(
    playerId: string,
    positionCode: string,
  ): Promise<PlayerPositionOrmEntity | null> {
    return this.positionRepository.findOne({
      where: {
        playerId: playerId.trim(),
        positionCode: positionCode.trim().toUpperCase(),
      },
    });
  }

  async findByPlayerId(playerId: string): Promise<PlayerPositionOrmEntity[]> {
    return this.positionRepository.find({
      where: {
        playerId: playerId.trim(),
      },
      order: {
        isPrimary: 'DESC',
        positionCode: 'ASC',
      },
    });
  }

  async upsert(
    playerId: string,
    positionCode: string,
    isPrimary: boolean,
  ): Promise<PlayerPositionOrmEntity> {
    const pId = playerId.trim();
    const posCode = positionCode.trim().toUpperCase();

    if (isPrimary) {
      // 1. Enforce single-primary rule by resetting other positions for this player
      await this.positionRepository
        .createQueryBuilder()
        .update(PlayerPositionOrmEntity)
        .set({ isPrimary: false })
        .where('player_id = :playerId', { playerId: pId })
        .execute();

      // 2. Synchronize players.primary_position
      await this.playerRepository.update(
        { id: pId },
        { primaryPosition: posCode },
      );
    }

    // 3. Find existing position record for (playerId, positionCode)
    const existing = await this.positionRepository.findOne({
      where: { playerId: pId, positionCode: posCode },
    });

    if (existing) {
      existing.isPrimary = isPrimary;
      return this.positionRepository.save(existing);
    }

    const newPosition = this.positionRepository.create({
      playerId: pId,
      positionCode: posCode,
      isPrimary,
    });

    return this.positionRepository.save(newPosition);
  }

  async upsertMany(
    positions: UpsertPlayerPositionItem[],
  ): Promise<PlayerPositionOrmEntity[]> {
    if (!positions || positions.length === 0) {
      return [];
    }

    // Deduplicate items by (playerId, positionCode), preserving the latest
    const map = new Map<string, UpsertPlayerPositionItem>();
    for (const item of positions) {
      if (!item || !item.playerId || !item.positionCode) continue;
      const key = `${item.playerId.trim()}:${item.positionCode.trim().toUpperCase()}`;
      map.set(key, item);
    }

    const results: PlayerPositionOrmEntity[] = [];
    for (const item of map.values()) {
      const persisted = await this.upsert(
        item.playerId,
        item.positionCode,
        item.isPrimary,
      );
      results.push(persisted);
    }

    return results;
  }

  async updatePrimaryPosition(
    manager: EntityManager,
    playerId: string,
    positionCode: string,
  ): Promise<PlayerOrmEntity> {
    const playerRepo = manager.getRepository(PlayerOrmEntity);
    const posRepo = manager.getRepository(PlayerPositionOrmEntity);

    const player = await playerRepo
      .createQueryBuilder('player')
      .setLock('pessimistic_write')
      .where('player.id = :playerId', { playerId })
      .getOne();

    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    await posRepo
      .createQueryBuilder()
      .update(PlayerPositionOrmEntity)
      .set({ isPrimary: false })
      .where('player_id = :playerId', { playerId })
      .execute();

    let target = await posRepo.findOne({
      where: { playerId, positionCode },
    });

    if (!target) {
      target = posRepo.create({
        playerId,
        positionCode,
        isPrimary: true,
      });
    } else {
      target.isPrimary = true;
    }

    await posRepo.save(target);

    player.primaryPosition = positionCode;
    return playerRepo.save(player);
  }
}
