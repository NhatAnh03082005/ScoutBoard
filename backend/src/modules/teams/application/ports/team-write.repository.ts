import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';
import { TransformedTeam } from '../../../external-football/domain/models/transformed-team.model';

export const TEAM_WRITE_REPOSITORY = Symbol('TEAM_WRITE_REPOSITORY');

export interface TeamWriteRepository {
  findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<TeamOrmEntity | null>;

  upsert(team: TransformedTeam): Promise<TeamOrmEntity>;

  upsertMany(teams: TransformedTeam[]): Promise<TeamOrmEntity[]>;
}
