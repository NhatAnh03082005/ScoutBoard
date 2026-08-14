import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerReadRepository,
  SearchPlayersQuery,
  FindPlayerMatchStatisticsQuery,
} from 'src/modules/players/application/ports/player-read.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../entities/player-team-history.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../entities/player-season-statistic.orm-entity';
import { PlayerMatchStatisticOrmEntity } from 'src/modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

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

  async findTeamHistoryByPlayerId(
    playerId: string,
  ): Promise<PlayerTeamHistoryOrmEntity[]> {
    const historyRepo = this.repository.manager.getRepository(
      PlayerTeamHistoryOrmEntity,
    );
    return historyRepo.find({
      where: { playerId },
      relations: ['team'],
      order: {
        isCurrent: 'DESC',
        startDate: 'DESC',
      },
    });
  }

  async findSeasonStatisticsByPlayerId(
    playerId: string,
  ): Promise<PlayerSeasonStatisticOrmEntity[]> {
    const statsRepo = this.repository.manager.getRepository(
      PlayerSeasonStatisticOrmEntity,
    );
    return statsRepo.find({
      where: { playerId },
      relations: ['season', 'competition', 'team'],
      order: {
        season: {
          isCurrent: 'DESC',
          seasonCode: 'DESC',
        },
        competition: {
          name: 'ASC',
        },
      },
    });
  }

  async findMatchStatisticsByPlayerId(
    playerId: string,
    query: FindPlayerMatchStatisticsQuery,
  ): Promise<{ items: PlayerMatchStatisticOrmEntity[]; total: number }> {
    const matchStatsRepo = this.repository.manager.getRepository(
      PlayerMatchStatisticOrmEntity,
    );

    const qb = matchStatsRepo
      .createQueryBuilder('pms')
      .leftJoinAndSelect('pms.team', 'team')
      .leftJoinAndSelect('pms.match', 'match')
      .leftJoinAndSelect('match.homeTeam', 'homeTeam')
      .leftJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.competition', 'competition')
      .leftJoinAndSelect('match.season', 'season')
      .where('pms.playerId = :playerId', { playerId });

    if (query.seasonId) {
      qb.andWhere('match.seasonId = :seasonId', { seasonId: query.seasonId });
    }

    if (query.competitionId) {
      qb.andWhere('match.competitionId = :competitionId', {
        competitionId: query.competitionId,
      });
    }

    if (query.teamId) {
      qb.andWhere('pms.teamId = :teamId', { teamId: query.teamId });
    }

    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;

    qb.orderBy('match.matchDate', 'DESC')
      .addOrderBy('pms.id', 'DESC')
      .take(limit)
      .skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
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
