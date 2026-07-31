import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

export const COMPETITION_READ_REPOSITORY = Symbol(
  'COMPETITION_READ_REPOSITORY',
);

export interface CompetitionReadRepository {
  findAll(): Promise<CompetitionOrmEntity[]>;
  findById(id: string): Promise<CompetitionOrmEntity | null>;
}
