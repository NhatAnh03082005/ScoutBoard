import { Shortlist, ShortlistVisibility } from '../entities/shortlist';

export const SHORTLIST_REPOSITORY = Symbol('SHORTLIST_REPOSITORY');

export interface ShortlistRepository {
  findById(id: string): Promise<Shortlist | null>;
  findByOwner(ownerId: string): Promise<Shortlist[]>;
  create(data: {
    ownerId: string;
    name: string;
    description?: string | null;
    visibility?: ShortlistVisibility;
  }): Promise<Shortlist>;
  save(shortlist: Shortlist): Promise<Shortlist>;
  delete(id: string): Promise<void>;
}
