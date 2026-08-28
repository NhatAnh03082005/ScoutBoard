import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerTeamHistoryWriteRepository,
  UpsertPlayerTeamHistoryItem,
} from 'src/modules/players/application/ports/player-team-history-write.repository';
import { PlayerTeamHistoryOrmEntity } from '../entities/player-team-history.orm-entity';
import { PlayerOrmEntity } from '../entities/player.orm-entity';

@Injectable()
export class TypeOrmPlayerTeamHistoryWriteRepository implements PlayerTeamHistoryWriteRepository {
  constructor(
    @InjectRepository(PlayerTeamHistoryOrmEntity)
    private readonly historyRepository: Repository<PlayerTeamHistoryOrmEntity>,
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
  ) {}

  async findByPlayerAndTeam(
    playerId: string,
    teamId: string,
    startDate?: string | null,
  ): Promise<PlayerTeamHistoryOrmEntity | null> {
    const pId = playerId.trim();
    const tId = teamId.trim();

    if (startDate !== undefined && startDate !== null && String(startDate).trim() !== '') {
      return this.historyRepository.findOne({
        where: {
          playerId: pId,
          teamId: tId,
          startDate: String(startDate).trim(),
        },
      });
    }

    return this.historyRepository.findOne({
      where: {
        playerId: pId,
        teamId: tId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByPlayerId(playerId: string): Promise<PlayerTeamHistoryOrmEntity[]> {
    return this.historyRepository.find({
      where: {
        playerId: playerId.trim(),
      },
      order: {
        isCurrent: 'DESC',
        startDate: 'DESC',
      },
    });
  }

  async upsert(
    item: UpsertPlayerTeamHistoryItem,
  ): Promise<PlayerTeamHistoryOrmEntity> {
    const pId = item.playerId.trim();
    const tId = item.teamId.trim();
    const isCurrent = Boolean(item.isCurrent);
    const startDate = item.startDate ? String(item.startDate).trim() : null;
    const endDate = item.endDate ? String(item.endDate).trim() : null;
    const shirtNumber =
      item.shirtNumber !== null && item.shirtNumber !== undefined
        ? Number(item.shirtNumber)
        : null;

    if (isCurrent) {
      // 1. Enforce single-current invariant for player team history
      await this.historyRepository
        .createQueryBuilder()
        .update(PlayerTeamHistoryOrmEntity)
        .set({ isCurrent: false })
        .where('player_id = :playerId', { playerId: pId })
        .execute();

      // 2. Synchronize players.current_team_id
      await this.playerRepository.update(
        { id: pId },
        { currentTeamId: tId },
      );
    }

    // 3. Find existing record by natural identity (playerId, teamId, startDate)
    const existing = await this.findByPlayerAndTeam(pId, tId, startDate);

    if (existing) {
      existing.startDate = startDate;
      existing.endDate = endDate;
      existing.shirtNumber = shirtNumber;
      existing.isCurrent = isCurrent;
      return this.historyRepository.save(existing);
    }

    const newHistory = this.historyRepository.create({
      playerId: pId,
      teamId: tId,
      startDate,
      endDate,
      shirtNumber,
      isCurrent,
    });

    return this.historyRepository.save(newHistory);
  }

  async upsertMany(
    items: UpsertPlayerTeamHistoryItem[],
  ): Promise<PlayerTeamHistoryOrmEntity[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Deduplicate items by natural key (playerId:teamId:startDate)
    const map = new Map<string, UpsertPlayerTeamHistoryItem>();
    for (const item of items) {
      if (!item || !item.playerId || !item.teamId) continue;
      const pId = item.playerId.trim();
      const tId = item.teamId.trim();
      const sDate = item.startDate ? String(item.startDate).trim() : '';
      const key = `${pId}:${tId}:${sDate}`;
      map.set(key, item);
    }

    const results: PlayerTeamHistoryOrmEntity[] = [];
    for (const item of map.values()) {
      const persisted = await this.upsert(item);
      results.push(persisted);
    }

    return results;
  }
}
