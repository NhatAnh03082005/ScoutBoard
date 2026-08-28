export interface TransformedMatch {
  externalProvider: string;
  externalId: string;
  matchDate: Date | null;
  status: string;
  matchday?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  dataUpdatedAt: Date | null;
  venue?: string | null;
  competitionExternalId?: string | null;
  seasonExternalId?: string | null;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
}
