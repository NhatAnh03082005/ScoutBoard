import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlayerMatchStatisticWriteRepository,
  PersistPlayerMatchStatisticInput,
} from '../../../../application/ports/player-match-statistic-write.repository';
import { PlayerMatchStatisticOrmEntity } from '../entities/player-match-statistic.orm-entity';
import { PlayerMatchStatisticsQualityValidator } from '../../../../domain/services/player-match-statistics-quality.validator';

@Injectable()
export class TypeOrmPlayerMatchStatisticWriteRepository implements PlayerMatchStatisticWriteRepository {
  constructor(
    @InjectRepository(PlayerMatchStatisticOrmEntity)
    private readonly repository: Repository<PlayerMatchStatisticOrmEntity>,
  ) {}

  async findByMatchAndPlayer(
    matchId: string,
    playerId: string,
  ): Promise<PlayerMatchStatisticOrmEntity | null> {
    return this.repository.findOne({
      where: {
        matchId,
        playerId,
      },
    });
  }

  async findByMatchId(
    matchId: string,
  ): Promise<PlayerMatchStatisticOrmEntity[]> {
    return this.repository.find({
      where: { matchId },
    });
  }

  /**
   * Upserts a player match statistic record with strict data-quality validation.
   */
  async upsert(
    input: PersistPlayerMatchStatisticInput,
  ): Promise<PlayerMatchStatisticOrmEntity> {
    const validation = PlayerMatchStatisticsQualityValidator.validate({
      matchId: input.matchId,
      playerId: input.playerId,
      teamId: input.teamId,
      minutesPlayed: input.minutesPlayed,
      goals: input.goals,
      shots: input.shots,
      shotsOnTarget: input.statistics?.shotsOnTarget,
      passesAttempted: input.passesAttempted,
      passesCompleted: input.passesCompleted,
      saves: input.saves,
      goalsConceded: input.goalsConceded,
      cleanSheets: input.cleanSheets,
      penaltiesSaved: input.penaltiesSaved,
      penaltiesFaced: input.statistics?.penaltiesFaced,
    });

    if (!validation.isValid) {
      throw new BadRequestException(
        `Data quality validation failed: ${validation.errors.join('; ')}`,
      );
    }

    const existing = await this.findByMatchAndPlayer(
      input.matchId,
      input.playerId,
    );

    if (existing) {
      existing.teamId = input.teamId;
      existing.minutesPlayed = input.minutesPlayed ?? existing.minutesPlayed;
      existing.isStarter = input.isStarter ?? existing.isStarter;
      existing.rating =
        input.rating !== undefined ? input.rating : existing.rating;
      existing.goals =
        input.goals !== undefined && input.goals !== null
          ? input.goals
          : existing.goals;
      existing.assists =
        input.assists !== undefined && input.assists !== null
          ? input.assists
          : existing.assists;
      existing.shots =
        input.shots !== undefined && input.shots !== null
          ? input.shots
          : existing.shots;
      existing.keyPasses =
        input.keyPasses !== undefined && input.keyPasses !== null
          ? input.keyPasses
          : existing.keyPasses;
      existing.passesAttempted =
        input.passesAttempted !== undefined && input.passesAttempted !== null
          ? input.passesAttempted
          : existing.passesAttempted;
      existing.passesCompleted =
        input.passesCompleted !== undefined && input.passesCompleted !== null
          ? input.passesCompleted
          : existing.passesCompleted;
      existing.tackles =
        input.tackles !== undefined && input.tackles !== null
          ? input.tackles
          : existing.tackles;
      existing.interceptions =
        input.interceptions !== undefined && input.interceptions !== null
          ? input.interceptions
          : existing.interceptions;
      existing.yellowCards =
        input.yellowCards !== undefined && input.yellowCards !== null
          ? input.yellowCards
          : existing.yellowCards;
      existing.redCards =
        input.redCards !== undefined && input.redCards !== null
          ? input.redCards
          : existing.redCards;
      existing.saves = input.saves !== undefined ? input.saves : existing.saves;
      existing.goalsConceded =
        input.goalsConceded !== undefined
          ? input.goalsConceded
          : existing.goalsConceded;
      existing.cleanSheets =
        input.cleanSheets !== undefined
          ? input.cleanSheets
          : existing.cleanSheets;
      existing.penaltiesSaved =
        input.penaltiesSaved !== undefined
          ? input.penaltiesSaved
          : existing.penaltiesSaved;

      if (input.statistics !== undefined) {
        existing.statistics =
          input.statistics && existing.statistics
            ? { ...existing.statistics, ...input.statistics }
            : (input.statistics ?? existing.statistics);
      }

      return this.repository.save(existing);
    }

    const entity = this.repository.create({
      matchId: input.matchId,
      playerId: input.playerId,
      teamId: input.teamId,
      minutesPlayed: input.minutesPlayed ?? 0,
      isStarter: input.isStarter ?? false,
      rating: input.rating ?? null,
      goals: input.goals ?? 0,
      assists: input.assists ?? 0,
      shots: input.shots ?? 0,
      keyPasses: input.keyPasses ?? 0,
      passesAttempted: input.passesAttempted ?? 0,
      passesCompleted: input.passesCompleted ?? 0,
      tackles: input.tackles ?? 0,
      interceptions: input.interceptions ?? 0,
      yellowCards: input.yellowCards ?? 0,
      redCards: input.redCards ?? 0,
      saves: input.saves ?? null,
      goalsConceded: input.goalsConceded ?? null,
      cleanSheets: input.cleanSheets ?? null,
      penaltiesSaved: input.penaltiesSaved ?? null,
      statistics: input.statistics ?? null,
    });

    return this.repository.save(entity);
  }

  async upsertBatch(
    inputs: PersistPlayerMatchStatisticInput[],
  ): Promise<PlayerMatchStatisticOrmEntity[]> {
    const results: PlayerMatchStatisticOrmEntity[] = [];
    for (const input of inputs) {
      const saved = await this.upsert(input);
      results.push(saved);
    }
    return results;
  }

  async deleteByMatchId(matchId: string): Promise<void> {
    await this.repository.delete({ matchId });
  }
}
