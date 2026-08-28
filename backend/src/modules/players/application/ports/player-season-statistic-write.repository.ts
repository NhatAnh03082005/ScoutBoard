import { PlayerSeasonStatisticOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { AggregatedSeasonStats } from '../../domain/services/player-season-statistics.aggregator';

export const PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY = Symbol(
  'PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY',
);

export interface PersistPlayerSeasonStatisticInput extends AggregatedSeasonStats {
  playerId: string;
  seasonId: string;
  competitionId: string;
  teamId?: string | null;
}

export interface PlayerSeasonStatisticWriteRepository {
  findByComposite(
    playerId: string,
    seasonId: string,
    competitionId: string,
    teamId?: string | null,
  ): Promise<PlayerSeasonStatisticOrmEntity | null>;

  upsert(
    input: PersistPlayerSeasonStatisticInput,
  ): Promise<PlayerSeasonStatisticOrmEntity>;
}
