export interface TransformedPlayerTeamHistory {
  playerExternalId: string;
  teamExternalId: string;
  externalProvider: string;
  firstObservedYear: number | null;
  lastObservedYear: number | null;
  startDate: string | null;
  endDate: string | null;
  shirtNumber: number | null;
  isCurrent: boolean;
}

export interface PlayerMatchAppearanceInput {
  playerExternalId: string;
  teamExternalId: string;
  matchUtcDate?: string | Date | null;
  shirtNumber?: number | null;
}

export interface PlayerPersonDetailInput {
  playerExternalId: string;
  currentTeamExternalId?: string | number | null;
  currentTeamContractStart?: string | null;
  currentTeamContractUntil?: string | null;
  shirtNumber?: number | null;
}
