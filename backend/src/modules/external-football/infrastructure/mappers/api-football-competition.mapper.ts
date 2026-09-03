import { ApiFootballLeagueResponseItemDto } from '../dto/api-football-league.dto';
import {
  TransformedCompetition,
  TransformedSeason,
} from '../../domain/models/transformed-competition.model';

export class ApiFootballCompetitionMapper {
  static toTransformedCompetition(
    item: ApiFootballLeagueResponseItemDto,
  ): TransformedCompetition {
    if (!item?.league?.id || !item?.league?.name) {
      throw new Error('Invalid API-Football league item: missing id or name');
    }

    const seasons: TransformedSeason[] = (item.seasons || []).map((s) => {
      const year = s.year;
      return {
        externalProvider: 'API_FOOTBALL',
        externalId: String(year),
        seasonCode: `${year}-${year + 1}`,
        name: `${item.league.name} ${year}/${year + 1}`,
        startDate: s.start || null,
        endDate: s.end || null,
        isCurrent: Boolean(s.current),
        currentMatchday: null,
      };
    });

    const currentSeason = seasons.find((s) => s.isCurrent) || seasons[seasons.length - 1] || null;

    return {
      externalProvider: 'API_FOOTBALL',
      externalId: String(item.league.id),
      name: item.league.name,
      code: item.country?.code || item.league.name.slice(0, 4).toUpperCase(),
      country: item.country?.name || null,
      type: item.league.type ? item.league.type.toUpperCase() : 'LEAGUE',
      logoUrl: item.league.logo || null,
      dataUpdatedAt: new Date(),
      currentSeason,
      seasons,
    };
  }
}
