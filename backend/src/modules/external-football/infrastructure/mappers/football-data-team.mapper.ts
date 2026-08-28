import {
  ExternalTeamDto,
  ExternalTeamDetailDto,
  ExternalTeamListDto,
} from '../dto/external-team.dto';
import { TransformedTeam } from '../../domain/models/transformed-team.model';
import { FootballDataPlayerMapper } from './football-data-player.mapper';
import { TransformedPlayer } from '../../domain/models/transformed-player.model';

export class FootballDataTeamMapper {
  private static readonly DEFAULT_PROVIDER = 'FOOTBALL_DATA_ORG';

  /**
   * Transforms an ExternalTeamDto or ExternalTeamDetailDto into TransformedTeam
   */
  static toTransformedTeam(
    dto: ExternalTeamDto | ExternalTeamDetailDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedTeam {
    if (!dto || dto.id === null || dto.id === undefined) {
      throw new Error('Cannot map invalid or empty team DTO');
    }

    const rawName = String(dto.name || '').trim();
    if (!rawName) {
      throw new Error('Team name is required');
    }

    const externalId = String(dto.id).trim();
    const shortName = dto.shortName ? String(dto.shortName).trim() : null;
    const tla = dto.tla ? String(dto.tla).trim().toUpperCase() : null;
    const foundedYear = typeof dto.founded === 'number' ? dto.founded : null;
    const venueName = dto.venue ? String(dto.venue).trim() : null;
    const logoUrl = dto.crest ? String(dto.crest).trim() : null;

    // Squad mapping if present (from team detail endpoint)
    let squad: TransformedPlayer[] = [];
    const detailDto = dto as ExternalTeamDetailDto;
    if (Array.isArray(detailDto.squad) && detailDto.squad.length > 0) {
      const seenPlayerIds = new Set<string>();
      for (const rawPlayer of detailDto.squad) {
        if (!rawPlayer || rawPlayer.id === null || rawPlayer.id === undefined) {
          continue;
        }
        const playerExtId = String(rawPlayer.id).trim();
        if (seenPlayerIds.has(playerExtId)) {
          continue;
        }
        try {
          const transformedPlayer = FootballDataPlayerMapper.toTransformedPlayer(
            rawPlayer,
            provider,
            externalId,
          );
          seenPlayerIds.add(playerExtId);
          squad.push(transformedPlayer);
        } catch {
          // Ignore invalid player gracefully
        }
      }
    }

    return {
      externalProvider: provider,
      externalId,
      name: rawName,
      shortName,
      tla,
      country: null, // Note: ExternalTeamDto may not have direct country unless in area
      foundedYear,
      venueName,
      logoUrl,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      squad,
    };
  }

  /**
   * Transforms an ExternalTeamListDto into an array of TransformedTeam
   */
  static toTransformedTeamList(
    listDto: ExternalTeamListDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedTeam[] {
    if (!listDto || !Array.isArray(listDto.teams)) {
      return [];
    }

    const seenIds = new Set<string>();
    const result: TransformedTeam[] = [];

    for (const raw of listDto.teams) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const extId = String(raw.id).trim();
      if (seenIds.has(extId)) {
        continue;
      }
      try {
        const transformed = this.toTransformedTeam(raw, provider);
        seenIds.add(extId);
        result.push(transformed);
      } catch {
        // Skip invalid team gracefully
      }
    }

    return result;
  }
}
