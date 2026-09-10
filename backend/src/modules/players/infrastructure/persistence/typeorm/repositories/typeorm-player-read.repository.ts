import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerReadRepository,
  SearchPlayersQuery,
  FindPlayerMatchStatisticsQuery,
  FindComparisonCandidatesQuery,
} from 'src/modules/players/application/ports/player-read.repository';
import { ComparisonScope } from 'src/modules/players/domain/enums/comparison-scope.enum';
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

  async findSeasonStatisticsByCompetitionAndSeason(
    seasonId: string,
    competitionId: string,
  ): Promise<PlayerSeasonStatisticOrmEntity[]> {
    const statsRepo = this.repository.manager.getRepository(
      PlayerSeasonStatisticOrmEntity,
    );
    return statsRepo.find({
      where: { seasonId, competitionId },
      relations: ['player'],
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
      .innerJoinAndSelect('pms.match', 'match')
      .leftJoinAndSelect('pms.team', 'team')
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
      .leftJoinAndSelect('player.currentTeam', 'currentTeam')
      .leftJoinAndSelect('player.positions', 'positions');

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(player.name ILIKE :search OR player.shortName ILIKE :search)',
        { search: searchTerm },
      );
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
      let posCode = query.position.trim().toUpperCase();
      // Canonical mapping for tactical slot roles (LCM/RCM -> CM, LDM/RDM -> CDM, LAM/RAM -> CAM, etc.)
      if (['LCM', 'RCM'].includes(posCode)) posCode = 'CM';
      else if (['LDM', 'RDM'].includes(posCode)) posCode = 'CDM';
      else if (['LAM', 'RAM', 'LCAM', 'RCAM'].includes(posCode)) posCode = 'CAM';
      else if (['LCB', 'RCB'].includes(posCode)) posCode = 'CB';
      else if (['LS', 'RS'].includes(posCode)) posCode = 'ST';
      else if (posCode === 'LWB') posCode = 'LB';
      else if (posCode === 'RWB') posCode = 'RB';

      qb.innerJoin('player.positions', 'pos');

      if (posCode === 'DEFENDER') {
        qb.andWhere(
          "(player.primaryPosition IN ('CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF') OR pos.positionCode IN ('CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'))",
        );
      } else if (posCode === 'MIDFIELDER') {
        qb.andWhere(
          "(player.primaryPosition IN ('CDM', 'CM', 'CAM', 'LM', 'RM', 'MID') OR pos.positionCode IN ('CDM', 'CM', 'CAM', 'LM', 'RM', 'MID'))",
        );
      } else if (posCode === 'FORWARD' || posCode === 'ATTACKER') {
        qb.andWhere(
          "(player.primaryPosition IN ('LW', 'RW', 'ST', 'CF', 'SS', 'FWD') OR pos.positionCode IN ('LW', 'RW', 'ST', 'CF', 'SS', 'FWD'))",
        );
      } else if (posCode === 'GOALKEEPER') {
        qb.andWhere(
          "(player.primaryPosition = 'GK' OR pos.positionCode = 'GK')",
        );
      } else if (posCode === 'CM') {
        qb.andWhere(
          "(player.primaryPosition IN ('CM', 'CDM', 'CAM', 'MID') OR pos.positionCode IN ('CM', 'CDM', 'CAM', 'MID'))",
        );
      } else if (posCode === 'CDM') {
        qb.andWhere(
          "(player.primaryPosition IN ('CDM', 'CM', 'MID') OR pos.positionCode IN ('CDM', 'CM', 'MID'))",
        );
      } else if (posCode === 'CAM') {
        qb.andWhere(
          "(player.primaryPosition IN ('CAM', 'CM', 'SS', 'MID') OR pos.positionCode IN ('CAM', 'CM', 'SS', 'MID'))",
        );
      } else if (posCode === 'CB') {
        qb.andWhere(
          "(player.primaryPosition IN ('CB', 'DEF') OR pos.positionCode IN ('CB', 'DEF'))",
        );
      } else if (posCode === 'ST') {
        qb.andWhere(
          "(player.primaryPosition IN ('ST', 'CF', 'SS', 'FWD') OR pos.positionCode IN ('ST', 'CF', 'SS', 'FWD'))",
        );
      } else if (posCode === 'LB') {
        qb.andWhere(
          "(player.primaryPosition IN ('LB', 'LWB', 'DEF') OR pos.positionCode IN ('LB', 'LWB', 'DEF'))",
        );
      } else if (posCode === 'RB') {
        qb.andWhere(
          "(player.primaryPosition IN ('RB', 'RWB', 'DEF') OR pos.positionCode IN ('RB', 'RWB', 'DEF'))",
        );
      } else if (posCode === 'LM') {
        qb.andWhere(
          "(player.primaryPosition IN ('LM', 'LW', 'LWB', 'CAM') OR pos.positionCode IN ('LM', 'LW', 'LWB', 'CAM'))",
        );
      } else if (posCode === 'RM') {
        qb.andWhere(
          "(player.primaryPosition IN ('RM', 'RW', 'RWB', 'CAM') OR pos.positionCode IN ('RM', 'RW', 'RWB', 'CAM'))",
        );
      } else {
        qb.andWhere(
          '(player.primaryPosition = :posCode OR pos.positionCode = :posCode)',
          { posCode },
        );
      }
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

    if (query.minWeightKg !== undefined) {
      qb.andWhere('player.weightKg >= :minWeightKg', {
        minWeightKg: query.minWeightKg,
      });
    }

    if (query.maxWeightKg !== undefined) {
      qb.andWhere('player.weightKg <= :maxWeightKg', {
        maxWeightKg: query.maxWeightKg,
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

  async findComparisonCandidates(
    currentPlayerId: string,
    query: FindComparisonCandidatesQuery,
  ): Promise<{ items: PlayerOrmEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.currentTeam', 'currentTeam')
      .leftJoinAndSelect('player.positions', 'positions')
      .innerJoin('player_season_statistics', 'pss', 'pss.player_id = player.id')
      .where('player.id != :currentPlayerId', { currentPlayerId });

    if (query.scope === ComparisonScope.COMPETITION && query.competitionId) {
      qb.andWhere(
        'pss.season_id = :seasonId AND pss.competition_id = :competitionId',
        {
          seasonId: query.seasonId,
          competitionId: query.competitionId,
        },
      );
    } else {
      qb.andWhere(
        'pss.season_id IN (SELECT s.id FROM seasons s WHERE s.season_code = (SELECT s2.season_code FROM seasons s2 WHERE s2.id = :seasonId))',
        {
          seasonId: query.seasonId,
        },
      );
    }

    if (query.currentTeamId) {
      qb.andWhere('player.currentTeamId = :currentTeamId', {
        currentTeamId: query.currentTeamId,
      });
    }

    if (query.search && query.search.trim() !== '') {
      const searchTerm = `%${query.search.trim()}%`;
      qb.andWhere(
        '(player.name ILIKE :search OR player.shortName ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (query.nationality && query.nationality.trim() !== '') {
      qb.andWhere('LOWER(player.nationality) = LOWER(:nationality)', {
        nationality: query.nationality.trim(),
      });
    }

    const targetPositions =
      query.position && query.position.trim() !== ''
        ? [query.position.trim()]
        : query.compatiblePositions && query.compatiblePositions.length > 0
          ? query.compatiblePositions
          : undefined;

    if (targetPositions && targetPositions.length > 0) {
      qb.andWhere(
        '(player.primaryPosition IN (:...targetPositions) OR EXISTS (SELECT 1 FROM player_positions pp WHERE pp.player_id = player.id AND pp.position_code IN (:...targetPositions)))',
        { targetPositions },
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

    if (query.minWeightKg !== undefined) {
      qb.andWhere('player.weightKg >= :minWeightKg', {
        minWeightKg: query.minWeightKg,
      });
    }

    if (query.maxWeightKg !== undefined) {
      qb.andWhere('player.weightKg <= :maxWeightKg', {
        maxWeightKg: query.maxWeightKg,
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

  async getDistinctPositions(): Promise<string[]> {
    return [
      'GK',
      'CB',
      'LB',
      'RB',
      'LWB',
      'RWB',
      'CDM',
      'CM',
      'LM',
      'RM',
      'CAM',
      'LW',
      'RW',
      'CF',
      'ST',
    ];
  }
}
