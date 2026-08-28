import { SportmonksFixtureResolver } from './sportmonks-fixture.resolver';

export interface CandidatePlayer {
  id: string; // ScoutBoard Player internal UUID
  name: string;
  normalizedName?: string | null;
  shirtNumber?: number | null;
  externalProvider?: string | null;
  externalId?: string | null;
}

export interface ResolveTeamIdentityInput {
  sportmonksTeamId: string | number;
  location?: 'home' | 'away' | null;
  matchHomeTeamId: string;
  matchAwayTeamId: string;
  sportmonksHomeParticipantId?: string | number | null;
  sportmonksAwayParticipantId?: string | number | null;
}

export interface TeamIdentityResolutionResult {
  resolved: boolean;
  teamId: string | null;
  strategy: 'MATCH_LOCATION_MAPPING' | 'PARTICIPANT_ID_MAPPING' | 'UNRESOLVED';
  reason?: string;
}

export interface ResolvePlayerIdentityInput {
  sportmonksPlayerId: string | number;
  playerName?: string | null;
  shirtNumber?: number | null;
  teamId: string; // Internal ScoutBoard Team UUID
  candidateSquadPlayers: CandidatePlayer[];
}

export interface PlayerIdentityResolutionResult {
  resolved: boolean;
  playerId: string | null;
  confidence: number;
  strategy: 'DIRECT_PROVIDER_ID' | 'TEAM_SQUAD_EXACT_MATCH' | 'TEAM_SQUAD_NUMBER_MATCH' | 'UNRESOLVED';
  reason?: string;
}

export class SportmonksIdentityResolver {
  /**
   * Resolves Sportmonks Team identifier to the canonical Match Home or Away Team UUID
   */
  static resolveTeamIdentity(input: ResolveTeamIdentityInput): TeamIdentityResolutionResult {
    if (!input || input.sportmonksTeamId === null || input.sportmonksTeamId === undefined) {
      return {
        resolved: false,
        teamId: null,
        strategy: 'UNRESOLVED',
        reason: 'Sportmonks team ID is required',
      };
    }

    const smTeamIdStr = String(input.sportmonksTeamId).trim();
    const homePartStr = input.sportmonksHomeParticipantId !== undefined && input.sportmonksHomeParticipantId !== null
      ? String(input.sportmonksHomeParticipantId).trim()
      : null;
    const awayPartStr = input.sportmonksAwayParticipantId !== undefined && input.sportmonksAwayParticipantId !== null
      ? String(input.sportmonksAwayParticipantId).trim()
      : null;

    // 1. Check direct participant ID mapping
    if (homePartStr && smTeamIdStr === homePartStr) {
      return {
        resolved: true,
        teamId: input.matchHomeTeamId,
        strategy: 'PARTICIPANT_ID_MAPPING',
      };
    }

    if (awayPartStr && smTeamIdStr === awayPartStr) {
      return {
        resolved: true,
        teamId: input.matchAwayTeamId,
        strategy: 'PARTICIPANT_ID_MAPPING',
      };
    }

    // 2. Check location metadata fallback
    if (input.location === 'home') {
      return {
        resolved: true,
        teamId: input.matchHomeTeamId,
        strategy: 'MATCH_LOCATION_MAPPING',
      };
    }

    if (input.location === 'away') {
      return {
        resolved: true,
        teamId: input.matchAwayTeamId,
        strategy: 'MATCH_LOCATION_MAPPING',
      };
    }

    return {
      resolved: false,
      teamId: null,
      strategy: 'UNRESOLVED',
      reason: `Could not associate Sportmonks team ID ${smTeamIdStr} with match home (${input.matchHomeTeamId}) or away (${input.matchAwayTeamId}) teams`,
    };
  }

  /**
   * Resolves Sportmonks Player to ScoutBoard Player UUID within the validated Team Squad
   */
  static resolvePlayerIdentity(input: ResolvePlayerIdentityInput): PlayerIdentityResolutionResult {
    if (!input || input.sportmonksPlayerId === null || input.sportmonksPlayerId === undefined) {
      return {
        resolved: false,
        playerId: null,
        confidence: 0,
        strategy: 'UNRESOLVED',
        reason: 'Sportmonks player ID is required',
      };
    }

    const smPlayerIdStr = String(input.sportmonksPlayerId).trim();
    const candidates = Array.isArray(input.candidateSquadPlayers) ? input.candidateSquadPlayers : [];

    if (candidates.length === 0) {
      return {
        resolved: false,
        playerId: null,
        confidence: 0,
        strategy: 'UNRESOLVED',
        reason: 'No candidate squad players provided for team',
      };
    }

    // STRATEGY 1: Direct Provider External ID Match (SPORTMONKS -> SPORTMONKS)
    const directProviderMatches = candidates.filter(
      (c) => c.externalProvider === 'SPORTMONKS' && String(c.externalId).trim() === smPlayerIdStr,
    );

    if (directProviderMatches.length === 1) {
      return {
        resolved: true,
        playerId: directProviderMatches[0].id,
        confidence: 1.0,
        strategy: 'DIRECT_PROVIDER_ID',
      };
    }

    if (directProviderMatches.length > 1) {
      return {
        resolved: false,
        playerId: null,
        confidence: 0,
        strategy: 'UNRESOLVED',
        reason: 'Duplicate direct provider identity found in squad candidates',
      };
    }

    // STRATEGY 2: Controlled Squad Reconciliation by Normalized Name & Shirt Number
    if (input.playerName && input.playerName.trim() !== '') {
      const normInputName = SportmonksFixtureResolver.normalizeName(input.playerName);

      const nameMatches = candidates.filter((c) => {
        const normCandName = c.normalizedName || SportmonksFixtureResolver.normalizeName(c.name);
        return (
          normCandName === normInputName ||
          (normCandName.length >= 6 && normInputName.length >= 6 && (normCandName.includes(normInputName) || normInputName.includes(normCandName)))
        );
      });

      if (nameMatches.length === 1) {
        return {
          resolved: true,
          playerId: nameMatches[0].id,
          confidence: 0.95,
          strategy: 'TEAM_SQUAD_EXACT_MATCH',
        };
      }

      // If multiple players share similar names in the same squad (e.g. "Gabriel Martinelli" vs "Gabriel Magalhaes"),
      // use shirt number as strict disambiguation discriminator
      if (nameMatches.length > 1 && input.shirtNumber !== null && input.shirtNumber !== undefined) {
        const numberMatches = nameMatches.filter((c) => c.shirtNumber === input.shirtNumber);
        if (numberMatches.length === 1) {
          return {
            resolved: true,
            playerId: numberMatches[0].id,
            confidence: 0.9,
            strategy: 'TEAM_SQUAD_NUMBER_MATCH',
          };
        }

        return {
          resolved: false,
          playerId: null,
          confidence: 0.4,
          strategy: 'UNRESOLVED',
          reason: `Ambiguous player identity: ${nameMatches.length} squad players matched name '${input.playerName}' and shirt number ${input.shirtNumber} was not unique`,
        };
      }

      if (nameMatches.length > 1) {
        return {
          resolved: false,
          playerId: null,
          confidence: 0.4,
          strategy: 'UNRESOLVED',
          reason: `Ambiguous player identity: ${nameMatches.length} squad players matched name '${input.playerName}' without shirt number discriminator`,
        };
      }
    }

    return {
      resolved: false,
      playerId: null,
      confidence: 0,
      strategy: 'UNRESOLVED',
      reason: `Player with Sportmonks ID ${smPlayerIdStr} (${input.playerName || 'Unknown'}) could not be resolved in team squad`,
    };
  }
}
