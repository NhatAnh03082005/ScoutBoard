import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import {
  PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY,
  PlayerMatchStatisticWriteRepository,
  PersistPlayerMatchStatisticInput,
} from '../ports/player-match-statistic-write.repository';
import { PlayerMatchStatisticOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { PlayerMatchStatisticsQualityValidator } from '../../domain/services/player-match-statistics-quality.validator';

export interface PersistBatchPlayerMatchStatisticsResult {
  total: number;
  persisted: number;
  skipped: number;
  statistics: PlayerMatchStatisticOrmEntity[];
  errors: Array<{ playerId: string; reason: string }>;
}

@Injectable()
export class PersistPlayerMatchStatisticsUseCase {
  private readonly logger = new Logger(PersistPlayerMatchStatisticsUseCase.name);

  constructor(
    @Inject(PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY)
    private readonly statRepository: PlayerMatchStatisticWriteRepository,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepository: Repository<MatchOrmEntity>,
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
  ) {}

  /**
   * Persists a single canonical player match statistic record with data-quality validation
   */
  async execute(
    input: PersistPlayerMatchStatisticInput,
  ): Promise<PlayerMatchStatisticOrmEntity> {
    // 1. Verify Match exists
    const match = await this.matchRepository.findOne({
      where: { id: input.matchId },
    });

    if (!match) {
      throw new NotFoundException(`Canonical Match with ID ${input.matchId} not found`);
    }

    // 2. Verify Player exists
    const player = await this.playerRepository.findOne({
      where: { id: input.playerId },
    });

    if (!player) {
      throw new NotFoundException(`Canonical Player with ID ${input.playerId} not found`);
    }

    // 3. Strict Data Quality Validation
    const validation = PlayerMatchStatisticsQualityValidator.validate({
      matchId: input.matchId,
      playerId: input.playerId,
      teamId: input.teamId,
      matchHomeTeamId: match.homeTeamId,
      matchAwayTeamId: match.awayTeamId,
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

    // 4. Persist/Upsert
    return this.statRepository.upsert(input);
  }

  /**
   * Persists a batch of player match statistics for a match with error isolation
   */
  async executeBatch(
    matchId: string,
    inputs: PersistPlayerMatchStatisticInput[],
  ): Promise<PersistBatchPlayerMatchStatisticsResult> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Canonical Match with ID ${matchId} not found`);
    }

    const persistedStats: PlayerMatchStatisticOrmEntity[] = [];
    const errors: Array<{ playerId: string; reason: string }> = [];

    for (const input of inputs) {
      try {
        const statInput: PersistPlayerMatchStatisticInput = {
          ...input,
          matchId,
        };

        const result = await this.execute(statInput);
        persistedStats.push(result);
      } catch (err: any) {
        this.logger.warn(
          `[PlayerMatchStats] Skipped persisting stats for player ${input.playerId}: ${err?.message || err}`,
        );
        errors.push({
          playerId: input.playerId,
          reason: err?.message || String(err),
        });
      }
    }

    return {
      total: inputs.length,
      persisted: persistedStats.length,
      skipped: errors.length,
      statistics: persistedStats,
      errors,
    };
  }
}
