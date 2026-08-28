import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TransformedMatch } from '../../../external-football/domain/models/transformed-match.model';

export const MATCH_WRITE_REPOSITORY = Symbol('MATCH_WRITE_REPOSITORY');

export interface MatchResolvedReferences {
  competitionId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface MatchWriteRepository {
  findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<MatchOrmEntity | null>;

  upsert(
    match: TransformedMatch,
    refs: MatchResolvedReferences,
  ): Promise<MatchOrmEntity>;

  upsertMany(
    items: Array<{ match: TransformedMatch; refs: MatchResolvedReferences }>,
  ): Promise<MatchOrmEntity[]>;
}
