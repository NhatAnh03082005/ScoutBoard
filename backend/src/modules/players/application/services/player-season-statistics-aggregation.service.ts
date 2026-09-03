import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerMatchStatisticOrmEntity } from '../../../matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { MatchOrmEntity } from '../../../matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import {
  PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY,
  PlayerSeasonStatisticWriteRepository,
} from '../ports/player-season-statistic-write.repository';
import { PlayerSeasonStatisticsAggregator } from '../../domain/services/player-season-statistics.aggregator';

export interface AggregatePlayerSeasonInput {
  playerId: string;
  seasonId: string;
  competitionId: string;
  teamId?: string | null;
}

export interface AggregateSeasonSummaryResult {
  seasonId: string;
  competitionId?: string;
  totalAggregated: number;
  results: PlayerSeasonStatisticOrmEntity[];
}

@Injectable()
export class PlayerSeasonStatisticsAggregationService {
  private readonly logger = new Logger(PlayerSeasonStatisticsAggregationService.name);

  constructor(
    @Inject(PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY)
    private readonly seasonStatRepo: PlayerSeasonStatisticWriteRepository,
    @InjectRepository(PlayerMatchStatisticOrmEntity)
    private readonly matchStatRepo: Repository<PlayerMatchStatisticOrmEntity>,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepo: Repository<MatchOrmEntity>,
  ) {}

  /**
   * Aggregates canonical season statistics for a specific player from their match statistics
   */
  async aggregatePlayerSeason(
    input: AggregatePlayerSeasonInput,
  ): Promise<PlayerSeasonStatisticOrmEntity> {
    const { playerId, seasonId, competitionId, teamId } = input;

    // 1. Query all match statistics for this player in this season/competition
    const query = this.matchStatRepo
      .createQueryBuilder('pms')
      .innerJoin('pms.match', 'match')
      .where('pms.playerId = :playerId', { playerId })
      .andWhere('match.seasonId = :seasonId', { seasonId })
      .andWhere('match.competitionId = :competitionId', { competitionId });

    if (teamId) {
      query.andWhere('pms.teamId = :teamId', { teamId });
    }

    const matchStats = await query.getMany();

    // 2. Pure deterministic aggregation & Per-90 calculation
    const aggregated = PlayerSeasonStatisticsAggregator.aggregate(matchStats);

    // 3. Upsert into player_season_statistics table
    const persisted = await this.seasonStatRepo.upsert({
      playerId,
      seasonId,
      competitionId,
      teamId: teamId ?? null,
      ...aggregated,
    });

    this.logger.log(
      `[SeasonAggregation] Player ${playerId} season ${seasonId}: ${aggregated.matchesPlayed} matches, ${aggregated.goals} goals, ${aggregated.minutesPlayed} mins (Goals/90: ${aggregated.goalsPer90})`,
    );

    return persisted;
  }

  /**
   * Automatically re-aggregates season statistics for all players who participated in a match
   */
  async aggregateAfterMatch(matchId: string): Promise<PlayerSeasonStatisticOrmEntity[]> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    const matchStats = await this.matchStatRepo.find({
      where: { matchId },
    });

    const results: PlayerSeasonStatisticOrmEntity[] = [];

    // Group players by (playerId, teamId)
    for (const stat of matchStats) {
      const persisted = await this.aggregatePlayerSeason({
        playerId: stat.playerId,
        seasonId: match.seasonId,
        competitionId: match.competitionId,
        teamId: stat.teamId,
      });
      results.push(persisted);
    }

    return results;
  }

  /**
   * Aggregates season statistics for all players in a season/competition
   */
  async aggregateAllForSeason(
    seasonId: string,
    competitionId?: string,
  ): Promise<AggregateSeasonSummaryResult> {
    const query = this.matchStatRepo
      .createQueryBuilder('pms')
      .innerJoin('pms.match', 'match')
      .select('pms.playerId', 'playerId')
      .addSelect('pms.teamId', 'teamId')
      .addSelect('match.seasonId', 'seasonId')
      .addSelect('match.competitionId', 'competitionId')
      .where('match.seasonId = :seasonId', { seasonId })
      .groupBy('pms.playerId')
      .addGroupBy('pms.teamId')
      .addGroupBy('match.seasonId')
      .addGroupBy('match.competitionId');

    if (competitionId) {
      query.andWhere('match.competitionId = :competitionId', { competitionId });
    }


    const rows = await query.getRawMany();
    const results: PlayerSeasonStatisticOrmEntity[] = [];

    for (const row of rows) {
      const res = await this.aggregatePlayerSeason({
        playerId: row.playerId,
        seasonId: row.seasonId,
        competitionId: row.competitionId,
        teamId: row.teamId,
      });
      results.push(res);
    }

    return {
      seasonId,
      competitionId,
      totalAggregated: results.length,
      results,
    };
  }
}
