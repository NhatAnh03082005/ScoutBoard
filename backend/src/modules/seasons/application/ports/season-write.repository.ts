import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TransformedSeason } from '../../../external-football/domain/models/transformed-competition.model';

export const SEASON_WRITE_REPOSITORY = Symbol('SEASON_WRITE_REPOSITORY');

export interface SeasonWriteRepository {
  findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<SeasonOrmEntity | null>;

  upsert(
    season: TransformedSeason,
    competitionId: string,
  ): Promise<SeasonOrmEntity>;

  upsertMany(
    seasons: TransformedSeason[],
    competitionId: string,
  ): Promise<SeasonOrmEntity[]>;
}
