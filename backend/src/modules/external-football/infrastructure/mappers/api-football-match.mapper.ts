import { ApiFootballFixtureResponseItemDto } from '../dto/api-football-fixture.dto';
import { TransformedMatch } from '../../domain/models/transformed-match.model';

export class ApiFootballMatchMapper {
  private static mapStatus(apiStatus?: string): string {
    if (!apiStatus) return 'SCHEDULED';
    const s = apiStatus.toUpperCase().trim();
    switch (s) {
      case 'FT':
      case 'AET':
      case 'PEN':
        return 'FINISHED';
      case '1H':
      case 'HT':
      case '2H':
      case 'ET':
      case 'BT':
      case 'P':
      case 'LIVE':
        return 'IN_PLAY';
      case 'PST':
      case 'CANC':
      case 'ABD':
      case 'AWD':
      case 'WO':
        return 'POSTPONED';
      case 'NS':
      case 'TBD':
      default:
        return 'SCHEDULED';
    }
  }

  private static parseMatchday(round?: string): number | null {
    if (!round) return null;
    const match = round.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  static toTransformedMatch(
    item: ApiFootballFixtureResponseItemDto,
  ): TransformedMatch {
    if (!item?.fixture?.id) {
      throw new Error('Invalid API-Football fixture: missing fixture id');
    }
    if (!item?.teams?.home?.id || !item?.teams?.away?.id) {
      throw new Error(
        'Invalid API-Football fixture: missing home or away team id',
      );
    }

    return {
      externalProvider: 'API_FOOTBALL',
      externalId: String(item.fixture.id),
      matchDate: item.fixture.date ? new Date(item.fixture.date) : null,
      status: this.mapStatus(item.fixture.status?.short),
      matchday: this.parseMatchday(item.league?.round),
      homeScore: item.goals?.home ?? null,
      awayScore: item.goals?.away ?? null,
      dataUpdatedAt: new Date(),
      venue: item.fixture.venue?.name || null,
      competitionExternalId: item.league?.id ? String(item.league.id) : null,
      seasonExternalId: item.league?.season ? String(item.league.season) : null,
      homeTeamExternalId: String(item.teams.home.id),
      awayTeamExternalId: String(item.teams.away.id),
    };
  }
}
