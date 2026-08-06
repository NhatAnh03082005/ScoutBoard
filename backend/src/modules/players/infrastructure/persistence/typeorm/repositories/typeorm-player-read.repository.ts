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

    if (query.teamId) {
      qb.andWhere('player.currentTeamId = :teamId', { teamId: query.teamId });
    }

    if (query.position) {
      qb.andWhere('player.primaryPosition = :position', {
        position: query.position,
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
