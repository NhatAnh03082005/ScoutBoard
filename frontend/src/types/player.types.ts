export interface PlayerTeam {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl?: string | null;
  country?: string | null;
}

export interface PlayerItem {
  id: string;
  fullName: string;
  imageUrl?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  preferredFoot?: 'LEFT' | 'RIGHT' | 'BOTH' | string | null;
  heightCm?: number | null;
  primaryPosition?: string | null;
  currentTeam?: PlayerTeam | null;
}

export interface PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
}

export interface PlayerListResponse {
  items: PlayerItem[];
  pagination: PaginationMetadata;
}

export interface PlayerFilterParams {
  search?: string;
  preferredFoot?: string;
  nationality?: string;
  currentTeamId?: string;
  position?: string;
  competitionId?: string;
  minAge?: number | string;
  maxAge?: number | string;
  minHeightCm?: number | string;
  maxHeightCm?: number | string;
  limit?: number;
  offset?: number;
}
