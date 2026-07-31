import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

export const MATCH_READ_REPOSITORY = Symbol('MATCH_READ_REPOSITORY');

export interface MatchReadRepository {
  findById(id: string): Promise<MatchOrmEntity | null>;
  findByCompetitionAndSeason(
    competitionId: string,
    seasonId: string,
  ): Promise<MatchOrmEntity[]>;
}
