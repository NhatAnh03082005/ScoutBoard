import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

export const TEAM_READ_REPOSITORY = Symbol('TEAM_READ_REPOSITORY');

export interface TeamReadRepository {
  findAll(): Promise<TeamOrmEntity[]>;
  findById(id: string): Promise<TeamOrmEntity | null>;
}
