import { PlayerMatchStatisticsQualityValidator } from './player-match-statistics-quality.validator';

describe('PlayerMatchStatisticsQualityValidator (Task 6.11 Data Quality & Invariant Verification)', () => {
  const validBaseInput = {
    matchId: 'match-uuid-1',
    playerId: 'player-uuid-1',
    teamId: 'home-team-uuid',
    matchHomeTeamId: 'home-team-uuid',
    matchAwayTeamId: 'away-team-uuid',
    minutesPlayed: 90,
    goals: 1,
    shots: 4,
    shotsOnTarget: 2,
    passesAttempted: 50,
    passesCompleted: 45,
    saves: null,
    goalsConceded: null,
    cleanSheets: null,
    penaltiesSaved: null,
    penaltiesFaced: null,
    reconciliationStatus: 'MATCHED',
  };

  it('TC-00: valid record passes validation with no errors', () => {
    const result =
      PlayerMatchStatisticsQualityValidator.validate(validBaseInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('TC-01: passes_completed > passes_attempted is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      passesAttempted: 30,
      passesCompleted: 35,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'passesCompleted (35) cannot exceed passesAttempted (30)',
        ),
      ]),
    );
  });

  it('TC-02: shots_on_target > shots is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      shots: 2,
      shotsOnTarget: 3,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'shotsOnTarget (3) cannot exceed total shots (2)',
        ),
      ]),
    );
  });

  it('TC-03: goals > shots_on_target is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      goals: 3,
      shots: 5,
      shotsOnTarget: 2,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('goals (3) cannot exceed shotsOnTarget (2)'),
      ]),
    );
  });

  it('TC-04: negative minutes_played is REJECTED without clamping/fabrication', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      minutesPlayed: -10,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Invalid minutesPlayed (-10)'),
      ]),
    );
  });

  it('TC-05: negative saves is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      saves: -3,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Invalid saves count (-3)'),
      ]),
    );
  });

  it('TC-06: negative goals_conceded is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      goalsConceded: -1,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Invalid goalsConceded (-1)'),
      ]),
    );
  });

  it('TC-07: clean_sheets = 1 when goals_conceded > 0 is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      cleanSheets: 1,
      goalsConceded: 2,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'cleanSheets cannot be 1 when goalsConceded is 2',
        ),
      ]),
    );
  });

  it('TC-08: penalties_saved > penalties_faced is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      penaltiesSaved: 3,
      penaltiesFaced: 2,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'penaltiesSaved (3) cannot exceed penaltiesFaced (2)',
        ),
      ]),
    );
  });

  it('TC-09: player assigned to third-party team not in match is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      teamId: 'other-unrelated-team-uuid',
      matchHomeTeamId: 'home-team-uuid',
      matchAwayTeamId: 'away-team-uuid',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Team mismatch: Player assigned to team other-unrelated-team-uuid',
        ),
      ]),
    );
  });

  it('TC-10: non-matched / ambiguous reconciliation status is REJECTED', () => {
    const result = PlayerMatchStatisticsQualityValidator.validate({
      ...validBaseInput,
      reconciliationStatus: 'AMBIGUOUS',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Cannot persist statistics for match status "AMBIGUOUS"',
        ),
      ]),
    );
  });
});
