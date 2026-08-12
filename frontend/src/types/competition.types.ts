export interface CompetitionItem {
  id: string;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
}

export interface CompetitionTeamItem {
  id: string;
  name: string;
  shortName: string | null;
  country?: string | null;
  logoUrl?: string | null;
}
