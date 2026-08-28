import { SportmonksFixtureDto } from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

export type ReconciliationStatus = 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'INVALID';

export interface ReconciliationOptions {
  kickoffToleranceHours?: number; // default 24h
  targetCompetitionId?: string | null;
  targetSeasonId?: string | null;
}

export interface MatchReconciliationResult {
  status: ReconciliationStatus;
  matchId: string | null;
  confidence: number;
  matchedMatch: MatchOrmEntity | null;
  reason?: string;
}

export class CrossProviderMatchReconciliationService {
  private static readonly DEFAULT_TOLERANCE_HOURS = 24;

  /**
   * Pure deterministic reconciliation between a Sportmonks Fixture and canonical ScoutBoard Matches
   */
  static reconcile(
    fixture: SportmonksFixtureDto,
    candidates: MatchOrmEntity[],
    resolvedHomeTeamId: string,
    resolvedAwayTeamId: string,
    options?: ReconciliationOptions,
  ): MatchReconciliationResult {
    // 1. Validate inputs
    if (!fixture || !fixture.id || !fixture.starting_at) {
      return {
        status: 'INVALID',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: 'Sportmonks fixture is missing ID or starting_at date',
      };
    }

    if (!resolvedHomeTeamId || !resolvedAwayTeamId) {
      return {
        status: 'INVALID',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: 'Resolved canonical home and away team IDs are required for reconciliation',
      };
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return {
        status: 'UNMATCHED',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: 'No canonical match candidates provided',
      };
    }

    const fixtureTime = this.parseUtcTimestamp(fixture.starting_at);
    if (fixtureTime === null) {
      return {
        status: 'INVALID',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: `Invalid starting_at timestamp in fixture: ${fixture.starting_at}`,
      };
    }

    const toleranceHours = options?.kickoffToleranceHours ?? this.DEFAULT_TOLERANCE_HOURS;
    const targetCompId = options?.targetCompetitionId;
    const targetSeasonId = options?.targetSeasonId;

    const matchedCandidates: Array<{
      match: MatchOrmEntity;
      driftHours: number;
      confidence: number;
    }> = [];

    for (const candidate of candidates) {
      if (!candidate || !candidate.id) {
        continue;
      }

      // 2. Direction check: Home & Away must match exact direction (Reversed home/away is strictly rejected)
      if (
        candidate.homeTeamId !== resolvedHomeTeamId ||
        candidate.awayTeamId !== resolvedAwayTeamId
      ) {
        continue;
      }

      // 3. Competition context check (e.g. Cup vs League with same teams)
      if (targetCompId && candidate.competitionId && candidate.competitionId !== targetCompId) {
        continue;
      }

      // 4. Season context check (e.g. Same teams playing in different seasons)
      if (targetSeasonId && candidate.seasonId && candidate.seasonId !== targetSeasonId) {
        continue;
      }

      // 5. Kickoff date & time tolerance check
      if (!candidate.matchDate) {
        continue;
      }

      const candidateTime = this.parseUtcTimestamp(candidate.matchDate);
      if (candidateTime === null) {
        continue;
      }

      const diffMs = Math.abs(fixtureTime - candidateTime);
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= toleranceHours) {
        // Confidence calculation based on time proximity
        let confidence = 1.0;
        if (diffHours > 2) {
          confidence = Math.max(0.7, 1.0 - (diffHours / toleranceHours) * 0.25);
        }

        matchedCandidates.push({
          match: candidate,
          driftHours: diffHours,
          confidence: Math.round(confidence * 100) / 100,
        });
      }
    }

    // 6. Evaluate matched candidates
    if (matchedCandidates.length === 0) {
      return {
        status: 'UNMATCHED',
        matchId: null,
        confidence: 0,
        matchedMatch: null,
        reason: `No canonical match found between home (${resolvedHomeTeamId}) and away (${resolvedAwayTeamId}) within ${toleranceHours}h tolerance`,
      };
    }

    // Sort by smallest drift hours
    matchedCandidates.sort((a, b) => a.driftHours - b.driftHours);

    // 7. Ambiguity check: if multiple distinct candidates matched within tolerance window
    if (matchedCandidates.length > 1) {
      const top1 = matchedCandidates[0];
      const top2 = matchedCandidates[1];

      // If both matches are within 1 hour of each other, reject as AMBIGUOUS
      if (Math.abs(top1.driftHours - top2.driftHours) < 2) {
        return {
          status: 'AMBIGUOUS',
          matchId: null,
          confidence: top1.confidence,
          matchedMatch: null,
          reason: `Ambiguous match: ${matchedCandidates.length} candidate matches found within kickoff tolerance window`,
        };
      }
    }

    const bestMatch = matchedCandidates[0];
    return {
      status: 'MATCHED',
      matchId: bestMatch.match.id,
      confidence: bestMatch.confidence,
      matchedMatch: bestMatch.match,
    };
  }

  private static parseUtcTimestamp(date: Date | string | null | undefined): number | null {
    if (!date) return null;
    if (date instanceof Date) {
      return date.getTime();
    }
    let str = String(date).trim();
    if (!str.endsWith('Z') && !str.includes('+') && str.includes(' ')) {
      str = str.replace(' ', 'T') + 'Z';
    } else if (!str.endsWith('Z') && !str.includes('+') && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
      str = str + 'T00:00:00Z';
    } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
      str = str + 'Z';
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? null : parsed;
  }
}
