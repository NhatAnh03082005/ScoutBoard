export type SquadVisibility = 'PRIVATE' | 'PUBLIC';

export type FormationCode =
  | '4-3-3 Attack'
  | '4-3-3'
  | '4-5-1'
  | '4-1-2-1-2 Wide'
  | '4-2-4'
  | '4-3-3 Defend'
  | '4-3-3 False 9'
  | '4-2-3-1 Narrow'
  | '4-5-1 Flat'
  | '4-3-3 Holding'
  | '4-2-2-2'
  | '4-2-3-1 Wide'
  | '4-3-1-2'
  | '4-1-2-1-2 Narrow'
  | '5-2-2-1'
  | '5-2-1-2'
  | '4-1-4-1'
  | '5-3-2'
  | '4-4-2 Flat'
  | '3-4-3 Flat'
  | '3-4-3 Diamond'
  | '4-4-2 Holding'
  | '4-4-1-1 Attack'
  | '4-4-1-1 Flat'
  | '3-4-1-2'
  | '5-4-1 Holding'
  | '5-4-1 Defend'
  | '3-5-1-1'
  | '3-5-2'
  | '4-3-2-1'
  | '3-4-2-1'
  | '4-2-1-3'
  | '4-1-3-2'
  | '3-1-4-2'
  // Backward compatibility aliases
  | '4-4-2'
  | '4-2-3-1'
  | '3-4-3'
  | '4-3-3 Flat';

export type SquadPlayerRole = 'STARTER' | 'SUBSTITUTE';

export interface Squad {
  id: string;
  ownerId: string;
  seasonId: string | null;
  name: string;
  formationCode: FormationCode | string;
  description: string | null;
  visibility: SquadVisibility;
  createdAt?: string;
  updatedAt?: string;
  playerCount?: number;
}

export interface CreateSquadRequest {
  name: string;
  formationCode: FormationCode | string;
  seasonId?: string | null;
  description?: string | null;
  visibility?: SquadVisibility;
}

export interface UpdateSquadRequest {
  name?: string;
  formationCode?: FormationCode | string;
  seasonId?: string | null;
  description?: string | null;
  visibility?: SquadVisibility;
}

export interface SquadPlayerItem {
  id: string;
  squadId: string;
  playerId: string;
  slotCode: string | null;
  role: SquadPlayerRole;
  isCaptain: boolean;
  displayOrder: number | null;
  createdAt?: string;
  updatedAt?: string;
  player?: {
    id: string;
    name: string;
    shortName?: string | null;
    primaryPosition?: string | null;
    rawPosition?: string | null;
    imageUrl?: string | null;
    shirtNumber?: number | null;
    dateOfBirth?: string | null;
    nationality?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    status?: string | null;
    currentTeam?: {
      id: string;
      name: string;
      shortName?: string | null;
      logoUrl?: string | null;
    } | null;
  };
}

export interface AddSquadPlayerRequest {
  playerId: string;
  role: SquadPlayerRole;
  slotCode?: string | null;
  isCaptain?: boolean;
}

export interface UpdateSquadPlayerRequest {
  role?: SquadPlayerRole;
  slotCode?: string | null;
  isCaptain?: boolean;
}
