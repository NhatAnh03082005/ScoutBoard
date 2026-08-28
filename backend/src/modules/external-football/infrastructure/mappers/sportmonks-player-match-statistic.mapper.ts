import {
  SportmonksFixtureDto,
  SportmonksLineupDto,
  SportmonksLineupDetailDto,
} from '../dto/sportmonks-fixture.dto';
import { TransformedPlayerMatchStatistic } from '../../domain/models/transformed-player-match-statistic.model';

export class SportmonksPlayerMatchStatisticMapper {
  private static readonly DEFAULT_PROVIDER = 'SPORTMONKS';

  /**
   * Transforms a single SportmonksLineupDto into a TransformedPlayerMatchStatistic.
   * PURE, DETERMINISTIC, NO FABRICATION OF DATA.
   */
  static toTransformedPlayerMatchStatistic(
    lineup: SportmonksLineupDto,
    fixture?: SportmonksFixtureDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedPlayerMatchStatistic {
    if (!lineup || lineup.player_id === null || lineup.player_id === undefined) {
      throw new Error('Cannot map invalid or empty lineup item');
    }

    if (lineup.team_id === null || lineup.team_id === undefined) {
      throw new Error('Lineup team_id is required');
    }

    const playerExternalId = String(lineup.player_id).trim();
    const teamExternalId = String(lineup.team_id).trim();
    const matchExternalId =
      fixture?.id !== null && fixture?.id !== undefined
        ? String(fixture.id).trim()
        : lineup.fixture_id
        ? String(lineup.fixture_id).trim()
        : null;

    const isStarter = this.determineIsStarter(lineup);
    const isGoalkeeper = this.determineIsGoalkeeper(lineup);

    const details = Array.isArray(lineup.details) ? lineup.details : [];

    // 1. Minutes Played
    // If provider gives negative minutes, it is invalid raw data -> null (no clamping to 0)
    let minutesPlayed = this.extractNullableNumericStat(details, [
      'minutes-played',
      'minutes_played',
      'minutes',
    ]);
    if (minutesPlayed !== null && minutesPlayed < 0) {
      minutesPlayed = null;
    } else if (minutesPlayed === null && lineup.type_id === 12 && details.length === 0) {
      // Unused bench substitute with zero match events explicitly received
      minutesPlayed = 0;
    }

    // 2. Rating (Preserve provider float precision, no synthetic rounding)
    const rating = this.extractRating(details);

    // 3. Core offensive & defensive metrics (Distinguish missing vs explicit 0)
    const goals = this.extractNullableNumericStat(details, ['goals', 'goals-scored']);
    const assists = this.extractNullableNumericStat(details, ['assists', 'goal-assists']);
    const shots = this.extractNullableNumericStat(details, ['shots-total', 'shots', 'total-shots']);
    const shotsOnTarget = this.extractNullableNumericStat(details, [
      'shots-on-target',
      'shots_on_target',
      'shots-insidebox',
    ]);

    const passesAttempted = this.extractNullableNumericStat(details, [
      'passes-total',
      'passes_attempted',
      'total-passes',
      'passes',
    ]);
    const passesCompleted = this.extractNullableNumericStat(details, [
      'passes-accurate',
      'passes_completed',
      'accurate-passes',
    ]);

    const keyPasses = this.extractNullableNumericStat(details, ['key-passes', 'key_passes']);
    const tackles = this.extractNullableNumericStat(details, ['tackles', 'tackles-total']);
    const interceptions = this.extractNullableNumericStat(details, ['interceptions', 'interceptions-total']);
    const duelsWon = this.extractNullableNumericStat(details, ['duels-won', 'duels_won']);
    const yellowCards = this.extractNullableNumericStat(details, ['yellowcards', 'yellow_cards', 'yellow-cards']);
    const redCards = this.extractNullableNumericStat(details, ['redcards', 'red_cards', 'red-cards']);

    // 4. Goalkeeper Specific Statistics
    // Strictly null for outfield players. For GKs, extract real values or null if invalid/missing
    let saves: number | null = null;
    let goalsConceded: number | null = null;
    let cleanSheets: number | null = null;
    let penaltiesSaved: number | null = null;
    let penaltiesFaced: number | null = null;

    if (isGoalkeeper) {
      const rawSaves = this.extractNullableNumericStat(details, ['saves', 'saves-total']);
      saves = rawSaves !== null && rawSaves >= 0 ? rawSaves : null;

      const rawGoalsConceded = this.extractNullableNumericStat(details, ['goals-conceded', 'goals_conceded']);
      goalsConceded = rawGoalsConceded !== null && rawGoalsConceded >= 0 ? rawGoalsConceded : null;

      cleanSheets = this.extractNullableNumericStat(details, ['cleansheets', 'clean_sheets', 'clean-sheets']);

      const rawPenSaved = this.extractNullableNumericStat(details, ['penalties-saved', 'penalties_saved']);
      penaltiesSaved = rawPenSaved !== null && rawPenSaved >= 0 ? rawPenSaved : null;

      const rawPenFaced = this.extractNullableNumericStat(details, ['penalties-faced', 'penalties_faced']);
      penaltiesFaced = rawPenFaced !== null && rawPenFaced >= 0 ? rawPenFaced : null;
    }

    // 5. Extended / Raw statistics for JSONB storage and reconciliation
    const extendedStatistics = this.extractExtendedStatistics(details, lineup);

    return {
      externalProvider: provider,
      playerExternalId,
      teamExternalId,
      matchExternalId,
      isStarter,
      minutesPlayed,
      rating,
      goals,
      assists,
      shots,
      shotsOnTarget,
      passesAttempted,
      passesCompleted,
      keyPasses,
      tackles,
      interceptions,
      duelsWon,
      yellowCards,
      redCards,
      saves,
      goalsConceded,
      cleanSheets,
      penaltiesSaved,
      penaltiesFaced,
      extendedStatistics,
    };
  }

  /**
   * Transforms all lineups in a SportmonksFixtureDto into an array of TransformedPlayerMatchStatistic
   */
  static toTransformedPlayerMatchStatistics(
    fixture: SportmonksFixtureDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedPlayerMatchStatistic[] {
    if (!fixture || !Array.isArray(fixture.lineups)) {
      return [];
    }

    const results: TransformedPlayerMatchStatistic[] = [];
    for (const lineup of fixture.lineups) {
      if (!lineup || lineup.player_id === null || lineup.player_id === undefined) {
        continue;
      }
      try {
        const transformed = this.toTransformedPlayerMatchStatistic(lineup, fixture, provider);
        results.push(transformed);
      } catch {
        // Skip invalid lineup item gracefully in batch
      }
    }

    return results;
  }

  /**
   * Starter Precedence Hierarchy:
   * 1. lineup.type_id === 11 (Sportmonks standard code for Lineup/Starter)
   * 2. lineup.type_id === 12 -> false (Sportmonks standard code for Bench/Substitute)
   * 3. 1 <= formation_position <= 11 -> true
   * 4. Fallback -> false
   */
  private static determineIsStarter(lineup: SportmonksLineupDto): boolean {
    if (lineup.type_id === 11) return true;
    if (lineup.type_id === 12) return false;
    if (
      typeof lineup.formation_position === 'number' &&
      lineup.formation_position >= 1 &&
      lineup.formation_position <= 11
    ) {
      return true;
    }
    return false;
  }

  /**
   * Goalkeeper Precedence Hierarchy:
   * 1. lineup.position_id === 24 (Sportmonks standard Goalkeeper position ID)
   * 2. lineup.player?.position_id === 24
   * 3. lineup.formation_position === 1 (Goalkeeper in traditional formation)
   * 4. lineup.position_id === 1
   * 5. Fallback -> false
   */
  private static determineIsGoalkeeper(lineup: SportmonksLineupDto): boolean {
    if (lineup.position_id === 24) return true;
    if (lineup.player?.position_id === 24) return true;
    if (lineup.formation_position === 1) return true;
    if (lineup.position_id === 1 || lineup.player?.position_id === 1) return true;
    return false;
  }

  private static extractNullableNumericStat(
    details: SportmonksLineupDetailDto[],
    codes: string[],
  ): number | null {
    for (const detail of details) {
      const code = this.getDetailCode(detail);
      if (code && codes.includes(code)) {
        return this.parseNumericValue(detail.value);
      }
    }
    return null;
  }

  private static extractRating(details: SportmonksLineupDetailDto[]): number | null {
    for (const detail of details) {
      const code = this.getDetailCode(detail);
      if (code && (code === 'rating' || code === 'player-rating' || code === 'player_rating')) {
        const val = this.parseNumericValue(detail.value);
        if (val !== null && val >= 0 && val <= 10) {
          // Preserve exact provider precision (no synthetic rounding)
          return val;
        }
      }
    }
    return null;
  }

  private static getDetailCode(detail: SportmonksLineupDetailDto): string | null {
    if (!detail) return null;
    const raw = detail.code || detail.type?.code || detail.type?.developer_name || detail.type?.name;
    return raw ? String(raw).toLowerCase().replace(/_/g, '-').trim() : null;
  }

  private static parseNumericValue(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return null;
      const parsed = parseFloat(trimmed);
      return isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'object') {
      if (typeof value.total === 'number') return value.total;
      if (typeof value.count === 'number') return value.count;
      if (typeof value.all === 'number') return value.all;
    }
    return null;
  }

  private static extractExtendedStatistics(
    details: SportmonksLineupDetailDto[],
    lineup: SportmonksLineupDto,
  ): Record<string, any> | null {
    const rawMap: Record<string, any> = {};

    if (lineup.jersey_number !== null && lineup.jersey_number !== undefined) {
      rawMap['jersey_number'] = lineup.jersey_number;
    }
    if (lineup.formation_position !== null && lineup.formation_position !== undefined) {
      rawMap['formation_position'] = lineup.formation_position;
    }
    if (lineup.formation_field) {
      rawMap['formation_field'] = lineup.formation_field;
    }

    for (const detail of details) {
      const code = this.getDetailCode(detail) || `type_${detail.type_id || 'unknown'}`;
      rawMap[code] = detail.value !== undefined ? detail.value : detail.data;
    }

    return Object.keys(rawMap).length > 0 ? rawMap : null;
  }
}
