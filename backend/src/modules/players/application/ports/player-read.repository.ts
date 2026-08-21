import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { PlayerMatchStatisticOrmEntity } from 'src/modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { PreferredFoot } from '../../domain/enums/preferred-foot.enum';
import { ComparisonScope } from '../../domain/enums/comparison-scope.enum';

export const PLAYER_READ_REPOSITORY = Symbol('PLAYER_READ_REPOSITORY');

export interface SearchPlayersQuery {
  search?: string;
  preferredFoot?: PreferredFoot;
  nationality?: string;
  currentTeamId?: string;
  currentSeasonId?: string;
  position?: string;
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  limit?: number;
  offset?: number;
}

export interface FindPlayerMatchStatisticsQuery {
  seasonId?: string;
  competitionId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
}

export interface FindComparisonCandidatesQuery {
  scope: ComparisonScope;
  seasonId: string;
  competitionId?: string;
  compatiblePositions?: string[];
  currentTeamId?: string;
  search?: string;
  position?: string;
  preferredFoot?: PreferredFoot;
  nationality?: string;
  minAge?: number;
  maxAge?: number;
  minHeightCm?: number;
  maxHeightCm?: number;
  limit?: number;
  offset?: number;
}

export interface PlayerReadRepository {
  findById(id: string): Promise<PlayerOrmEntity | null>;
  search(
    query: SearchPlayersQuery,
  ): Promise<{ items: PlayerOrmEntity[]; total: number }>;
  findTeamHistoryByPlayerId(
    playerId: string,
  ): Promise<PlayerTeamHistoryOrmEntity[]>;
  findSeasonStatisticsByPlayerId(
    playerId: string,
  ): Promise<PlayerSeasonStatisticOrmEntity[]>;
  findSeasonStatisticsByCompetitionAndSeason(
    seasonId: string,
    competitionId: string,
  ): Promise<PlayerSeasonStatisticOrmEntity[]>;
  findMatchStatisticsByPlayerId(
    playerId: string,
    query: FindPlayerMatchStatisticsQuery,
  ): Promise<{ items: PlayerMatchStatisticOrmEntity[]; total: number }>;
  findComparisonCandidates(
    currentPlayerId: string,
    query: FindComparisonCandidatesQuery,
  ): Promise<{ items: PlayerOrmEntity[]; total: number }>;
}
