import {
  SportmonksFixtureDto,
  SportmonksParticipantDto,
} from '../../infrastructure/dto/sportmonks-fixture.dto';

export interface CanonicalMatchResolutionInput {
  matchId?: string;
  matchDate: Date | string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamTla?: string | null;
  awayTeamTla?: string | null;
  competitionCode?: string | null;
}

export interface MatchResolutionResult {
  matched: boolean;
  fixture: SportmonksFixtureDto | null;
  confidence: number; // 0.0 to 1.0
  reason?: string;
}

export class SportmonksFixtureResolver {
  /**
   * Resolves a ScoutBoard canonical match against a candidate pool of Sportmonks fixtures
   */
  static resolveMatch(
    canonical: CanonicalMatchResolutionInput,
    candidates: SportmonksFixtureDto[],
  ): MatchResolutionResult {
    if (!canonical || !canonical.homeTeamName || !canonical.awayTeamName) {
      return {
        matched: false,
        fixture: null,
        confidence: 0,
        reason: 'Canonical match missing required team names',
      };
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return {
        matched: false,
        fixture: null,
        confidence: 0,
        reason: 'No candidate Sportmonks fixtures provided',
      };
    }

    const canonicalDateStr = this.extractDateString(canonical.matchDate);
    const scoredMatches: Array<{
      fixture: SportmonksFixtureDto;
      score: number;
    }> = [];

    for (const fixture of candidates) {
      if (!fixture || !fixture.participants || fixture.participants.length < 2) {
        continue;
      }

      // 1. Date Check (within +/- 1 day to handle UTC shifts)
      const fixtureDateStr = this.extractDateString(fixture.starting_at);
      if (canonicalDateStr && fixtureDateStr && !this.isDateCompatible(canonicalDateStr, fixtureDateStr)) {
        continue;
      }

      const { homeParticipant, awayParticipant } = this.extractParticipants(fixture);
      if (!homeParticipant || !awayParticipant) {
        continue;
      }

      // 2. Home Team Match Score
      const homeScore = this.calculateTeamSimilarity(
        canonical.homeTeamName,
        canonical.homeTeamTla,
        homeParticipant.name,
        homeParticipant.short_code,
      );

      // 3. Away Team Match Score
      const awayScore = this.calculateTeamSimilarity(
        canonical.awayTeamName,
        canonical.awayTeamTla,
        awayParticipant.name,
        awayParticipant.short_code,
      );

      // Both teams must meet the minimum threshold (>= 0.75)
      if (homeScore >= 0.75 && awayScore >= 0.75) {
        const combinedScore = (homeScore + awayScore) / 2;
        scoredMatches.push({
          fixture,
          score: combinedScore,
        });
      }
    }

    if (scoredMatches.length === 0) {
      return {
        matched: false,
        fixture: null,
        confidence: 0,
        reason: 'No matching fixture found meeting similarity threshold',
      };
    }

    // Sort descending by score
    scoredMatches.sort((a, b) => b.score - a.score);

    // Ambiguity Check: if top 2 have identical high scores, reject
    if (
      scoredMatches.length > 1 &&
      scoredMatches[0].score === scoredMatches[1].score &&
      scoredMatches[0].fixture.id !== scoredMatches[1].fixture.id
    ) {
      return {
        matched: false,
        fixture: null,
        confidence: scoredMatches[0].score,
        reason: 'Ambiguous match: multiple fixtures matched with identical confidence',
      };
    }

    return {
      matched: true,
      fixture: scoredMatches[0].fixture,
      confidence: scoredMatches[0].score,
    };
  }

  /**
   * Extracts home and away participants from Sportmonks fixture
   */
  private static extractParticipants(fixture: SportmonksFixtureDto): {
    homeParticipant: SportmonksParticipantDto | null;
    awayParticipant: SportmonksParticipantDto | null;
  } {
    const participants = fixture.participants || [];
    let homeParticipant = participants.find((p) => p.meta?.location === 'home') || null;
    let awayParticipant = participants.find((p) => p.meta?.location === 'away') || null;

    if (!homeParticipant && !awayParticipant && participants.length >= 2) {
      homeParticipant = participants[0];
      awayParticipant = participants[1];
    }

    return { homeParticipant, awayParticipant };
  }

  /**
   * Calculates similarity between canonical team and Sportmonks participant
   */
  static calculateTeamSimilarity(
    canonicalName: string,
    canonicalTla?: string | null,
    smName?: string | null,
    smShortCode?: string | null,
  ): number {
    if (!canonicalName || !smName) {
      return 0;
    }

    const normCanonical = this.normalizeName(canonicalName);
    const normSm = this.normalizeName(smName);

    // 1. Exact normalized name match
    if (normCanonical === normSm) {
      return 1.0;
    }

    // 2. TLA / Short Code exact match
    if (
      canonicalTla &&
      smShortCode &&
      canonicalTla.trim().toUpperCase() === smShortCode.trim().toUpperCase()
    ) {
      return 0.95;
    }

    // 3. Substring containment only if long enough and non-generic
    if (
      (normCanonical.includes(normSm) && normSm.length >= 5) ||
      (normSm.includes(normCanonical) && normCanonical.length >= 5)
    ) {
      return 0.9;
    }

    // 4. Token analysis
    const tokensCanonical = normCanonical.split(' ').filter((t) => t.length > 1);
    const tokensSm = normSm.split(' ').filter((t) => t.length > 1);

    if (tokensCanonical.length === 0 || tokensSm.length === 0) {
      return 0;
    }

    const setCanonical = new Set(tokensCanonical);
    const setSm = new Set(tokensSm);

    let commonCount = 0;
    for (const token of setCanonical) {
      if (setSm.has(token)) {
        commonCount++;
      }
    }

    // If both names have distinguishing secondary tokens that conflict (e.g. 'city' vs 'united'), reject
    const conflictingTokens = ['city', 'united', 'town', 'hotspur', 'wanderers', 'rovers', 'albion', 'athletic', 'real', 'atletico', 'inter', 'milan', 'bayern', 'borussia'];
    for (const conflict of conflictingTokens) {
      if (
        (setCanonical.has(conflict) && !setSm.has(conflict)) ||
        (setSm.has(conflict) && !setCanonical.has(conflict))
      ) {
        return 0.2; // heavy penalty for conflicting team identity suffix
      }
    }

    const jaccard = commonCount / Math.max(setCanonical.size, setSm.size);
    return jaccard >= 0.7 ? 0.75 + jaccard * 0.2 : jaccard;
  }

  /**
   * Normalizes a club name by removing accents, punctuation, and common suffixes
   */
  static normalizeName(name: string): string {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/\./g, '') // remove dots (e.g. C.F. -> CF)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(fc|cf|afc|sc|fk|club|football club|de|del|la|the)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static extractDateString(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    const match = String(date).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }

  private static isDateCompatible(dateA: string, dateB: string): boolean {
    if (dateA === dateB) return true;
    const tA = new Date(dateA).getTime();
    const tB = new Date(dateB).getTime();
    if (isNaN(tA) || isNaN(tB)) return false;
    const diffDays = Math.abs(tA - tB) / (1000 * 60 * 60 * 24);
    return diffDays <= 1; // within 1 day
  }
}
