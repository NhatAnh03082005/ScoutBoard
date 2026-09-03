import { ApiFootballTeamResponseItemDto } from '../dto/api-football-team.dto';
import { TransformedTeam } from '../../domain/models/transformed-team.model';
import { TransformedPlayer } from '../../domain/models/transformed-player.model';

export class ApiFootballTeamMapper {
  static toTransformedTeam(
    item: ApiFootballTeamResponseItemDto,
    squad: TransformedPlayer[] = [],
  ): TransformedTeam {
    if (!item?.team?.id || !item?.team?.name) {
      throw new Error('Invalid API-Football team item: missing id or name');
    }

    return {
      externalProvider: 'API_FOOTBALL',
      externalId: String(item.team.id),
      name: item.team.name,
      shortName: item.team.code || item.team.name,
      tla: item.team.code || null,
      country: item.team.country || null,
      foundedYear: item.team.founded || null,
      venueName: item.venue?.name || null,
      logoUrl: item.team.logo || null,
      status: 'ACTIVE',
      dataUpdatedAt: new Date(),
      squad,
    };
  }
}
