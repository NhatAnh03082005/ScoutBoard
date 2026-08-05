import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

export const SEASON_READ_REPOSITORY = Symbol('SEASON_READ_REPOSITORY');

export interface SeasonReadRepository {
  findAll(competitionId?: string): Promise<SeasonOrmEntity[]>;
  findByCompetition(competitionId: string): Promise<SeasonOrmEntity[]>;
  findById(id: string): Promise<SeasonOrmEntity | null>;
}
