import { PlayerMatchStatisticOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

export const PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY = Symbol(
  'PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY',
);

export interface PersistPlayerMatchStatisticInput {
  matchId: string; // Canonical Match UUID
  playerId: string; // Canonical Player UUID
  teamId: string; // Canonical Team UUID
  minutesPlayed?: number | null;
  isStarter?: boolean;
  rating?: number | null;
  goals?: number | null;
  assists?: number | null;
  shots?: number | null;
  keyPasses?: number | null;
  passesAttempted?: number | null;
  passesCompleted?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  saves?: number | null;
  goalsConceded?: number | null;
  cleanSheets?: number | null;
  penaltiesSaved?: number | null;
  statistics?: Record<string, any> | null;
}

export interface PlayerMatchStatisticWriteRepository {
  findByMatchAndPlayer(
    matchId: string,
    playerId: string,
  ): Promise<PlayerMatchStatisticOrmEntity | null>;

  findByMatchId(
    matchId: string,
  ): Promise<PlayerMatchStatisticOrmEntity[]>;

  upsert(
    input: PersistPlayerMatchStatisticInput,
  ): Promise<PlayerMatchStatisticOrmEntity>;

  upsertBatch(
    inputs: PersistPlayerMatchStatisticInput[],
  ): Promise<PlayerMatchStatisticOrmEntity[]>;

  deleteByMatchId(matchId: string): Promise<void>;
}
