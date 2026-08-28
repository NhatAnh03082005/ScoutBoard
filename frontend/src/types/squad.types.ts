export type SquadVisibility = 'PRIVATE' | 'PUBLIC';

export type FormationCode = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2' | '3-4-3';

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
  addedAt?: string;
  player?: {
    id: string;
    name: string;
    shortName: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    heightCm: number | null;
    weightKg: number | null;
    preferredFoot: string | null;
    primaryPosition: string | null;
    shirtNumber: number | null;
    imageUrl: string | null;
    currentTeam: {
      id: string;
      name: string;
      shortName: string | null;
      logoUrl: string | null;
    } | null;
  } | null;
}
