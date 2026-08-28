export interface TransformedSeason {
  externalProvider: string;
  externalId: string;
  seasonCode: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  currentMatchday: number | null;
}

export interface TransformedCompetition {
  externalProvider: string;
  externalId: string;
  name: string;
  code: string | null;
  country: string | null;
  type: string | null;
  logoUrl: string | null;
  dataUpdatedAt: Date | null;
  currentSeason: TransformedSeason | null;
  seasons: TransformedSeason[];
}
