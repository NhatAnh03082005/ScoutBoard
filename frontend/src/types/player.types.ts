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

export interface PlayerPositionItem {
  id: string;
  positionCode: string;
  isPrimary: boolean;
}

export interface PlayerDetail {
  id: string;
  name: string;
  fullName?: string;
  shortName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  preferredFoot?: string | null;
  primaryPosition?: string | null;
  shirtNumber?: number | null;
  imageUrl?: string | null;
  status?: string;
  currentTeam?: PlayerTeam | null;
  positions?: PlayerPositionItem[];
}

export interface PlayerTeamHistoryItem {
  id: string;
  team: PlayerTeam;
  joinedAt: string | null;
  leftAt: string | null;
  shirtNumber: number | null;
  isCurrent: boolean;
}

export interface PlayerSeasonStatisticItem {
  id: string;
  season: {
    id: string;
    seasonCode: string | null;
    isCurrent: boolean;
  };
  competition: {
    id: string;
    name: string;
    country: string | null;
  };
  team: PlayerTeam | null;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;

  // Per-90 Metrics
  goalsPer90: number | null;
  assistsPer90: number | null;
  shotsPer90: number | null;
  shotsOnTargetPer90: number | null;
  passesPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;
  duelsWonPer90: number | null;
}

export interface PlayerMatchStatisticItem {
  id: string;
  match: {
    id: string;
    kickoffAt: string | null;
    status: string;
    competition: {
      id: string;
      name: string;
      country: string | null;
    };
    season: {
      id: string;
      seasonCode: string | null;
    };
    homeTeam: PlayerTeam;
    awayTeam: PlayerTeam;
    homeScore: number | null;
    awayScore: number | null;
  };
  team: PlayerTeam;
  minutesPlayed: number;
  isStarter: boolean;
  rating: number | null;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  tackles: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
  statistics: Record<string, unknown> | null;
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

export interface PlayerMatchStatisticsResponse {
  items: PlayerMatchStatisticItem[];
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

export interface PlayerMatchFilterParams {
  seasonId?: string;
  competitionId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
}

export type ComparisonScopeType = 'COMPETITION' | 'ALL';

export interface ComparisonCandidateParams {
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId?: string;
  currentTeamId?: string;
  search?: string;
  position?: string;
  preferredFoot?: string;
  nationality?: string;
  minAge?: number | string;
  maxAge?: number | string;
  minHeightCm?: number | string;
  maxHeightCm?: number | string;
  limit?: number;
  offset?: number;
}
