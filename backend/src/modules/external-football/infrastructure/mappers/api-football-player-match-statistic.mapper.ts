import { ApiFootballFixturePlayerItemDto } from '../dto/api-football-fixture-player.dto';
import { TransformedPlayerMatchStatistic } from '../../domain/models/transformed-player-match-statistic.model';

export class ApiFootballPlayerMatchStatisticMapper {
  private static parsePassesCompleted(
    total: number | null,
    accuracy: string | null,
  ): number | null {
    if (total === null || total === undefined) return null;
    if (!accuracy) return total > 0 ? null : 0;

    const cleanAcc = accuracy.replace('%', '').trim();
    const parsed = parseFloat(cleanAcc);
    if (isNaN(parsed)) return null;

    // If accuracy is a percentage (or includes '%')
    if (accuracy.includes('%') || parsed > total) {
      return Math.round((total * parsed) / 100);
    }
    // If accuracy is the count of completed passes directly (e.g. "35" out of 38)
    return Math.min(total, Math.round(parsed));
  }

  static toTransformedStatistic(
    item: ApiFootballFixturePlayerItemDto,
    teamExternalId: string,
    matchExternalId: string,
  ): TransformedPlayerMatchStatistic {
    if (!item?.player?.id) {
      throw new Error('Invalid fixture player: missing player id');
    }

    const stat = item.statistics?.[0] || ({} as any);
    const games = stat.games || {};
    const goals = stat.goals || {};
    const shots = stat.shots || {};
    const passes = stat.passes || {};
    const tackles = stat.tackles || {};
    const duels = stat.duels || {};
    const cards = stat.cards || {};
    const penalty = stat.penalty || {};

    const isGoalkeeper = games.position === 'G';
    const minutesPlayed = games.minutes !== undefined && games.minutes !== null ? games.minutes : 0;
    const isStarter = games.substitute === false;

    // Outfield vs Goalkeeper specific logic
    let saves: number | null = null;
    let goalsConceded: number | null = null;
    let cleanSheets: number | null = null;
    let penaltiesSaved: number | null = null;
    let penaltiesFaced: number | null = null;

    if (isGoalkeeper) {
      saves = goals.saves ?? 0;
      goalsConceded = goals.conceded ?? 0;
      cleanSheets = (goalsConceded === 0 && minutesPlayed >= 45) ? 1 : 0;
      penaltiesSaved = penalty.saved ?? 0;
      penaltiesFaced = (penalty.saved ?? 0) + (penalty.commited ?? 0);
    }

    const passesAttempted = passes.total !== undefined && passes.total !== null ? passes.total : null;
    const passesCompleted = this.parsePassesCompleted(passesAttempted, passes.accuracy ?? null);

    return {
      externalProvider: 'API_FOOTBALL',
      playerExternalId: String(item.player.id),
      teamExternalId: String(teamExternalId),
      matchExternalId: String(matchExternalId),
      isStarter,
      minutesPlayed,
      rating: games.rating ? parseFloat(games.rating) : null,
      goals: goals.total ?? 0,
      assists: goals.assists ?? 0,
      shots: shots.total ?? 0,
      shotsOnTarget: shots.on ?? 0,
      passesAttempted,
      passesCompleted,
      keyPasses: passes.key ?? 0,
      tackles: tackles.total ?? 0,
      interceptions: tackles.interceptions ?? 0,
      duelsWon: duels.won ?? 0,
      yellowCards: cards.yellow ?? 0,
      redCards: cards.red ?? 0,
      // GK specific
      saves,
      goalsConceded,
      cleanSheets,
      penaltiesSaved,
      penaltiesFaced,
      // Raw stats & extended attributes
      extendedStatistics: {
        rawStats: stat,
        foulsDrawn: stat.fouls?.drawn ?? 0,
        foulsCommitted: stat.fouls?.committed ?? 0,
        blocks: tackles.blocks ?? 0,
        dribbleAttempts: stat.dribbles?.attempts ?? 0,
        dribblesSuccess: stat.dribbles?.success ?? 0,
      },
    };
  }
}
