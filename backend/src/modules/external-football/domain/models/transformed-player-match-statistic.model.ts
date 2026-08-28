export interface TransformedPlayerMatchStatistic {
  externalProvider: string;
  playerExternalId: string;
  teamExternalId: string;
  matchExternalId?: string | null;
  isStarter: boolean;
  minutesPlayed: number | null;
  rating: number | null;
  goals: number | null;
  assists: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  passesAttempted: number | null;
  passesCompleted: number | null;
  keyPasses: number | null;
  tackles: number | null;
  interceptions: number | null;
  duelsWon: number | null;
  yellowCards: number | null;
  redCards: number | null;
  // Goalkeeper Specific Statistics (Strictly null for outfield players)
  saves: number | null;
  goalsConceded: number | null;
  cleanSheets: number | null;
  penaltiesSaved: number | null;
  penaltiesFaced: number | null;
  // Extended / Raw statistics for JSONB storage & reconciliation
  extendedStatistics: Record<string, any> | null;
}
