export interface ValidatePlayerMatchStatisticInput {
  matchId: string;
  playerId: string;
  teamId: string;
  matchHomeTeamId?: string;
  matchAwayTeamId?: string;
  minutesPlayed?: number | null;
  goals?: number | null;
  shots?: number | null;
  shotsOnTarget?: number | null;
  passesAttempted?: number | null;
  passesCompleted?: number | null;
  saves?: number | null;
  goalsConceded?: number | null;
  cleanSheets?: number | null;
  penaltiesSaved?: number | null;
  penaltiesFaced?: number | null;
  reconciliationStatus?: string;
}

export interface PlayerMatchStatisticValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PlayerMatchStatisticsQualityValidator {
  /**
   * Pure deterministic validator for player match statistics invariants
   */
  static validate(input: ValidatePlayerMatchStatisticInput): PlayerMatchStatisticValidationResult {
    const errors: string[] = [];

    // Invariant 0: Required UUID identifiers
    if (!input.matchId || typeof input.matchId !== 'string' || input.matchId.trim() === '') {
      errors.push('Invalid matchId: UUID string required');
    }
    if (!input.playerId || typeof input.playerId !== 'string' || input.playerId.trim() === '') {
      errors.push('Invalid playerId: UUID string required');
    }
    if (!input.teamId || typeof input.teamId !== 'string' || input.teamId.trim() === '') {
      errors.push('Invalid teamId: UUID string required');
    }

    // Invariant 9: Player must belong to one of the canonical match teams
    if (input.matchHomeTeamId && input.matchAwayTeamId) {
      if (input.teamId !== input.matchHomeTeamId && input.teamId !== input.matchAwayTeamId) {
        errors.push(
          `Team mismatch: Player assigned to team ${input.teamId} which is neither Home (${input.matchHomeTeamId}) nor Away (${input.matchAwayTeamId}) team of match ${input.matchId}`,
        );
      }
    }

    // Invariant 13: Reconciled match must not be ambiguous or unmatched
    if (input.reconciliationStatus && input.reconciliationStatus !== 'MATCHED') {
      errors.push(
        `Invalid match reconciliation status: Cannot persist statistics for match status "${input.reconciliationStatus}"`,
      );
    }

    // Invariant 4: minutes_played >= 0 (no negative values allowed)
    if (input.minutesPlayed !== undefined && input.minutesPlayed !== null) {
      if (input.minutesPlayed < 0 || !Number.isInteger(input.minutesPlayed)) {
        errors.push(`Invalid minutesPlayed (${input.minutesPlayed}): must be an integer >= 0`);
      }
    }

    // Invariant 1: passes_completed <= passes_attempted where both are known
    if (
      input.passesAttempted !== undefined &&
      input.passesAttempted !== null &&
      input.passesCompleted !== undefined &&
      input.passesCompleted !== null
    ) {
      if (input.passesAttempted < 0 || input.passesCompleted < 0) {
        errors.push('Invalid pass counts: passesAttempted and passesCompleted cannot be negative');
      } else if (input.passesCompleted > input.passesAttempted) {
        errors.push(
          `Invalid pass invariant: passesCompleted (${input.passesCompleted}) cannot exceed passesAttempted (${input.passesAttempted})`,
        );
      }
    }

    // Invariant 2: shots_on_target <= shots where both are known
    if (
      input.shots !== undefined &&
      input.shots !== null &&
      input.shotsOnTarget !== undefined &&
      input.shotsOnTarget !== null
    ) {
      if (input.shots < 0 || input.shotsOnTarget < 0) {
        errors.push('Invalid shot counts: shots and shotsOnTarget cannot be negative');
      } else if (input.shotsOnTarget > input.shots) {
        errors.push(
          `Invalid shot invariant: shotsOnTarget (${input.shotsOnTarget}) cannot exceed total shots (${input.shots})`,
        );
      }
    }

    // Invariant 3: goals <= shots_on_target where shots_on_target is known and valid
    if (
      input.goals !== undefined &&
      input.goals !== null &&
      input.shotsOnTarget !== undefined &&
      input.shotsOnTarget !== null
    ) {
      if (input.goals < 0) {
        errors.push(`Invalid goals count (${input.goals}): cannot be negative`);
      } else if (input.goals > input.shotsOnTarget) {
        errors.push(
          `Invalid goal invariant: goals (${input.goals}) cannot exceed shotsOnTarget (${input.shotsOnTarget})`,
        );
      }
    }

    // Invariant 5: saves >= 0 (GK)
    if (input.saves !== undefined && input.saves !== null) {
      if (input.saves < 0 || !Number.isInteger(input.saves)) {
        errors.push(`Invalid saves count (${input.saves}): must be an integer >= 0`);
      }
    }

    // Invariant 6: goals_conceded >= 0 (GK)
    if (input.goalsConceded !== undefined && input.goalsConceded !== null) {
      if (input.goalsConceded < 0 || !Number.isInteger(input.goalsConceded)) {
        errors.push(`Invalid goalsConceded (${input.goalsConceded}): must be an integer >= 0`);
      }
    }

    // Invariant 7: clean_sheets consistency with GK semantics
    if (input.cleanSheets !== undefined && input.cleanSheets !== null) {
      if (input.cleanSheets < 0 || input.cleanSheets > 1) {
        errors.push(`Invalid cleanSheets (${input.cleanSheets}): single match clean_sheets must be 0 or 1`);
      } else if (
        input.cleanSheets === 1 &&
        input.goalsConceded !== undefined &&
        input.goalsConceded !== null &&
        input.goalsConceded > 0
      ) {
        errors.push(
          `Invalid clean_sheet invariant: cleanSheets cannot be 1 when goalsConceded is ${input.goalsConceded}`,
        );
      }
    }

    // Invariant 8: penalties_saved <= penalties_faced when both are available
    if (
      input.penaltiesSaved !== undefined &&
      input.penaltiesSaved !== null &&
      input.penaltiesFaced !== undefined &&
      input.penaltiesFaced !== null
    ) {
      if (input.penaltiesSaved < 0 || input.penaltiesFaced < 0) {
        errors.push('Invalid penalty counts: penaltiesSaved and penaltiesFaced cannot be negative');
      } else if (input.penaltiesSaved > input.penaltiesFaced) {
        errors.push(
          `Invalid penalty invariant: penaltiesSaved (${input.penaltiesSaved}) cannot exceed penaltiesFaced (${input.penaltiesFaced})`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
