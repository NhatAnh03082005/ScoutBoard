import { Squad, SquadVisibility, FormationCode } from '../entities/squad';

export const SQUAD_REPOSITORY = Symbol('SQUAD_REPOSITORY');

export interface SquadRepository {
  findById(id: string): Promise<Squad | null>;
  findByOwner(ownerId: string): Promise<Squad[]>;
  create(data: {
    ownerId: string;
    name: string;
    formationCode: FormationCode | string;
    seasonId?: string | null;
    description?: string | null;
    visibility?: SquadVisibility;
  }): Promise<Squad>;
  save(squad: Squad): Promise<Squad>;
  delete(id: string): Promise<void>;
}
