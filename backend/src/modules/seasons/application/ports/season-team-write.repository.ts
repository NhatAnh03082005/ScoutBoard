import { SeasonTeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season-team.orm-entity';

export const SEASON_TEAM_WRITE_REPOSITORY = Symbol('SEASON_TEAM_WRITE_REPOSITORY');

export interface SeasonTeamWriteRepository {
  addTeamToSeason(seasonId: string, teamId: string): Promise<SeasonTeamOrmEntity>;

  addTeamsToSeason(seasonId: string, teamIds: string[]): Promise<SeasonTeamOrmEntity[]>;

  removeTeamFromSeason(seasonId: string, teamId: string): Promise<void>;

  findBySeasonAndTeam(
    seasonId: string,
    teamId: string,
  ): Promise<SeasonTeamOrmEntity | null>;

  findBySeasonId(seasonId: string): Promise<SeasonTeamOrmEntity[]>;
}
