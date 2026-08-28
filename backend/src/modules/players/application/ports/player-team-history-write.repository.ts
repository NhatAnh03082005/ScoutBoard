import { PlayerTeamHistoryOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';

export const PLAYER_TEAM_HISTORY_WRITE_REPOSITORY = Symbol(
  'PLAYER_TEAM_HISTORY_WRITE_REPOSITORY',
);

export interface UpsertPlayerTeamHistoryItem {
  playerId: string;
  teamId: string;
  startDate?: string | null;
  endDate?: string | null;
  shirtNumber?: number | null;
  isCurrent?: boolean;
}

export interface PlayerTeamHistoryWriteRepository {
  findByPlayerAndTeam(
    playerId: string,
    teamId: string,
    startDate?: string | null,
  ): Promise<PlayerTeamHistoryOrmEntity | null>;

  findByPlayerId(playerId: string): Promise<PlayerTeamHistoryOrmEntity[]>;

  upsert(
    item: UpsertPlayerTeamHistoryItem,
  ): Promise<PlayerTeamHistoryOrmEntity>;

  upsertMany(
    items: UpsertPlayerTeamHistoryItem[],
  ): Promise<PlayerTeamHistoryOrmEntity[]>;
}
