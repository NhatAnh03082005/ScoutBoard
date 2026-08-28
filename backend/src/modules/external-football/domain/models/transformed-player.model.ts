export interface TransformedPlayer {
  externalProvider: string;
  externalId: string;
  name: string;
  normalizedName: string | null;
  shortName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: string | null;
  primaryPosition: string | null;
  shirtNumber: number | null;
  imageUrl: string | null;
  status: string;
  dataUpdatedAt: Date | null;
  currentTeamExternalId?: string | null;
}
