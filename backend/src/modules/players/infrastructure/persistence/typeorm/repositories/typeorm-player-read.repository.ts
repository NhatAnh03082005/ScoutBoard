import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerReadRepository,
  SearchPlayersQuery,
} from 'src/modules/players/application/ports/player-read.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';

@Injectable()
export class TypeOrmPlayerReadRepository implements PlayerReadRepository {
  constructor(
    @InjectRepository(PlayerOrmEntity)
    private readonly repository: Repository<PlayerOrmEntity>,
  ) {}

  async findById(id: string): Promise<PlayerOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['currentTeam', 'positions', 'seasonStatistics'],
    });
  }

  async search(
    query: SearchPlayersQuery,
  ): Promise<{ items: PlayerOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.currentTeam', 'currentTeam');

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(player.name ILIKE :search OR player.shortName ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (query.preferredFoot) {
      qb.andWhere('player.preferredFoot = :preferredFoot', {
        preferredFoot: query.preferredFoot,
      });
    }

    if (query.nationality && query.nationality.trim() !== '') {
      qb.andWhere('LOWER(player.nationality) = LOWER(:nationality)', {
        nationality: query.nationality.trim(),
      });
    }

    if (query.currentTeamId) {
      qb.andWhere('player.currentTeamId = :currentTeamId', {
        currentTeamId: query.currentTeamId,
      });
    }

    if (query.position && query.position.trim() !== '') {
      const posCode = query.position.trim();
      qb.innerJoin('player.positions', 'pos').andWhere(
        '(player.primaryPosition = :posCode OR pos.positionCode = :posCode)',
        { posCode },
      );
    }

    if (query.currentSeasonId) {
      qb.andWhere(
        'player.currentTeamId IN (SELECT st.team_id FROM season_teams st WHERE st.season_id = :currentSeasonId)',
        { currentSeasonId: query.currentSeasonId },
      );
    }

    if (query.minAge !== undefined) {
      qb.andWhere(
        'EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth)) >= :minAge',
        { minAge: query.minAge },
      );
    }

    if (query.maxAge !== undefined) {
      qb.andWhere(
        'EXTRACT(YEAR FROM age(CURRENT_DATE, player.date_of_birth)) <= :maxAge',
        { maxAge: query.maxAge },
      );
    }

    if (query.minHeightCm !== undefined) {
      qb.andWhere('player.heightCm >= :minHeightCm', {
        minHeightCm: query.minHeightCm,
      });
    }

    if (query.maxHeightCm !== undefined) {
      qb.andWhere('player.heightCm <= :maxHeightCm', {
        maxHeightCm: query.maxHeightCm,
      });
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    qb.orderBy('player.name', 'ASC')
      .addOrderBy('player.id', 'ASC')
      .take(limit)
      .skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
