import type { PlayerMatchStatisticItem } from "../../../types/player.types";

/**
 * Format full name into dramatic sports title (firstName, lastName)
 */
export const formatSportsName = (fullName: string): { firstName: string; lastName: string } => {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
};

/**
 * Calculate player age from ISO date of birth string
 */
export const calculateAge = (dateOfBirth?: string | null): string => {
  if (!dateOfBirth) return "—";
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age}`;
};

export interface MatchContext {
  isHome: boolean;
  opponent: { id: string; name: string; shortName?: string | null; logoUrl?: string | null } | null;
  venuePrefix: "vs" | "@";
  result: "WIN" | "DRAW" | "LOSS" | null;
  scoreText: string;
}

/**
 * Determine match outcome, opponent, venue prefix and score text
 */
export const getMatchContext = (item: PlayerMatchStatisticItem): MatchContext => {
  const { match, team } = item;
  const isHome = team ? team.id === match.homeTeam.id : true;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const venuePrefix = isHome ? "vs" : "@";

  let result: "WIN" | "DRAW" | "LOSS" | null = null;
  let scoreText = "—";

  if (
    match.homeScore !== null &&
    match.awayScore !== null &&
    !isNaN(match.homeScore) &&
    !isNaN(match.awayScore)
  ) {
    scoreText = `${match.homeScore} - ${match.awayScore}`;
    if (match.homeScore === match.awayScore) {
      result = "DRAW";
    } else if (isHome) {
      result = match.homeScore > match.awayScore ? "WIN" : "LOSS";
    } else {
      result = match.awayScore > match.homeScore ? "WIN" : "LOSS";
    }
  }

  return {
    isHome,
    opponent,
    venuePrefix,
    result,
    scoreText,
  };
};
