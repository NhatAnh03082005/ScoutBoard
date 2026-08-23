export type ShortlistVisibility = 'PRIVATE' | 'PUBLIC';

export interface Shortlist {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  visibility: ShortlistVisibility;
  createdAt?: string;
  updatedAt?: string;
  playerCount?: number;
}

export interface CreateShortlistRequest {
  name: string;
  description?: string;
  visibility?: ShortlistVisibility;
}

export interface UpdateShortlistRequest {
  name?: string;
  description?: string | null;
  visibility?: ShortlistVisibility;
}

export interface ShortlistPlayerItem {
  id: string;
  shortlistId: string;
  playerId: string;
  note: string | null;
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
