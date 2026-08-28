import { SquadPlayer, SquadPlayerRole } from '../entities/squad-player';

export const SQUAD_PLAYER_REPOSITORY = Symbol('SQUAD_PLAYER_REPOSITORY');

export interface SquadPlayerRepository {
  findBySquadAndPlayer(
    squadId: string,
    playerId: string,
  ): Promise<SquadPlayer | null>;
  findBySquadId(squadId: string): Promise<SquadPlayer[]>;
  findPlayersWithDetailsBySquadId(squadId: string): Promise<any[]>;
  findStarterBySlotCode(
    squadId: string,
    slotCode: string,
  ): Promise<SquadPlayer | null>;
  findCaptainBySquadId(squadId: string): Promise<SquadPlayer | null>;
  addPlayer(data: {
    squadId: string;
    playerId: string;
    slotCode?: string | null;
    role: SquadPlayerRole | string;
    isCaptain?: boolean;
    displayOrder?: number | null;
  }): Promise<SquadPlayer>;
  save(squadPlayer: SquadPlayer): Promise<SquadPlayer>;
  removePlayer(squadId: string, playerId: string): Promise<void>;
}
