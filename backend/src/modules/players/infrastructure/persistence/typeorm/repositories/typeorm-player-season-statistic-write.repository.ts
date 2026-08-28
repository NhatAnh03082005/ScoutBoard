import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerSeasonStatisticWriteRepository,
  PersistPlayerSeasonStatisticInput,
} from '../../../../application/ports/player-season-statistic-write.repository';
import { PlayerSeasonStatisticOrmEntity } from '../entities/player-season-statistic.orm-entity';

@Injectable()
export class TypeOrmPlayerSeasonStatisticWriteRepository
  implements PlayerSeasonStatisticWriteRepository
{
  constructor(
    @InjectRepository(PlayerSeasonStatisticOrmEntity)
    private readonly repository: Repository<PlayerSeasonStatisticOrmEntity>,
  ) {}

  async findByComposite(
    playerId: string,
    seasonId: string,
    competitionId: string,
    teamId?: string | null,
  ): Promise<PlayerSeasonStatisticOrmEntity | null> {
    const query = this.repository
      .createQueryBuilder('pss')
      .where('pss.playerId = :playerId', { playerId })
      .andWhere('pss.seasonId = :seasonId', { seasonId })
      .andWhere('pss.competitionId = :competitionId', { competitionId });

    if (teamId) {
      query.andWhere('pss.teamId = :teamId', { teamId });
    } else {
      query.andWhere('pss.teamId IS NULL');
    }

    return query.getOne();
  }

  async upsert(
    input: PersistPlayerSeasonStatisticInput,
  ): Promise<PlayerSeasonStatisticOrmEntity> {
    const existing = await this.findByComposite(
      input.playerId,
      input.seasonId,
      input.competitionId,
      input.teamId,
    );

    if (existing) {
      existing.matchesPlayed = input.matchesPlayed;
      existing.starts = input.starts;
      existing.minutesPlayed = input.minutesPlayed;
      existing.goals = input.goals;
      existing.assists = input.assists;
      existing.shots = input.shots;
      existing.shotsOnTarget = input.shotsOnTarget;
      existing.keyPasses = input.keyPasses;
      existing.passesAttempted = input.passesAttempted;
      existing.passesCompleted = input.passesCompleted;
      existing.tackles = input.tackles;
      existing.interceptions = input.interceptions;
      existing.yellowCards = input.yellowCards;
      existing.redCards = input.redCards;
      existing.duelsWon = input.duelsWon;
      existing.advancedStatistics = input.advancedStatistics;

      existing.goalsPer90 = input.goalsPer90;
      existing.assistsPer90 = input.assistsPer90;
      existing.keyPassesPer90 = input.keyPassesPer90;
      existing.tacklesPer90 = input.tacklesPer90;
      existing.interceptionsPer90 = input.interceptionsPer90;

      existing.saves = input.saves;
      existing.goalsConceded = input.goalsConceded;
      existing.cleanSheets = input.cleanSheets;
      existing.penaltiesSaved = input.penaltiesSaved;
      existing.penaltiesFaced = input.penaltiesFaced;
      existing.savesPer90 = input.savesPer90;
      existing.goalsConcededPer90 = input.goalsConcededPer90;
      existing.savePercentage = input.savePercentage;

      return this.repository.save(existing);
    }

    const entity = this.repository.create({
      playerId: input.playerId,
      seasonId: input.seasonId,
      competitionId: input.competitionId,
      teamId: input.teamId ?? null,
      matchesPlayed: input.matchesPlayed,
      starts: input.starts,
      minutesPlayed: input.minutesPlayed,
      goals: input.goals,
      assists: input.assists,
      shots: input.shots,
      shotsOnTarget: input.shotsOnTarget,
      keyPasses: input.keyPasses,
      passesAttempted: input.passesAttempted,
      passesCompleted: input.passesCompleted,
      tackles: input.tackles,
      interceptions: input.interceptions,
      yellowCards: input.yellowCards,
      redCards: input.redCards,
      duelsWon: input.duelsWon,
      advancedStatistics: input.advancedStatistics,

      goalsPer90: input.goalsPer90,
      assistsPer90: input.assistsPer90,
      keyPassesPer90: input.keyPassesPer90,
      tacklesPer90: input.tacklesPer90,
      interceptionsPer90: input.interceptionsPer90,

      saves: input.saves,
      goalsConceded: input.goalsConceded,
      cleanSheets: input.cleanSheets,
      penaltiesSaved: input.penaltiesSaved,
      penaltiesFaced: input.penaltiesFaced,
      savesPer90: input.savesPer90,
      goalsConcededPer90: input.goalsConcededPer90,
      savePercentage: input.savePercentage,
    });

    return this.repository.save(entity);
  }
}
