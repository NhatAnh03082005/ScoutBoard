import { ShortlistPlayer } from '../entities/shortlist-player';

export const SHORTLIST_PLAYER_REPOSITORY = Symbol('SHORTLIST_PLAYER_REPOSITORY');

export interface ShortlistPlayerRepository {
  findByShortlistAndPlayer(
    shortlistId: string,
    playerId: string,
  ): Promise<ShortlistPlayer | null>;
  findByShortlistId(shortlistId: string): Promise<ShortlistPlayer[]>;
  findPlayersWithDetailsByShortlistId(shortlistId: string): Promise<any[]>;
  addPlayer(data: {
    shortlistId: string;
    playerId: string;
    note?: string | null;
  }): Promise<ShortlistPlayer>;
  save(shortlistPlayer: ShortlistPlayer): Promise<ShortlistPlayer>;
  removePlayer(shortlistId: string, playerId: string): Promise<void>;
}
