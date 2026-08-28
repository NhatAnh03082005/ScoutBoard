import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { TransformedCompetition } from '../../../external-football/domain/models/transformed-competition.model';

export const COMPETITION_WRITE_REPOSITORY = Symbol(
  'COMPETITION_WRITE_REPOSITORY',
);

export interface CompetitionWriteRepository {
  findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<CompetitionOrmEntity | null>;

  upsert(competition: TransformedCompetition): Promise<CompetitionOrmEntity>;
}
