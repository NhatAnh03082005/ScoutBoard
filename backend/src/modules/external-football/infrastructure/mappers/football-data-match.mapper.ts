import {
  ExternalMatchDto,
  ExternalMatchDetailDto,
  ExternalMatchListDto,
} from '../dto/external-match.dto';
import { TransformedMatch } from '../../domain/models/transformed-match.model';

export class FootballDataMatchMapper {
  private static readonly DEFAULT_PROVIDER = 'FOOTBALL_DATA_ORG';

  /**
   * Transforms an ExternalMatchDto or ExternalMatchDetailDto into TransformedMatch
   */
  static toTransformedMatch(
    dto: ExternalMatchDto | ExternalMatchDetailDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedMatch {
    if (!dto || dto.id === null || dto.id === undefined) {
      throw new Error('Cannot map invalid or empty match DTO');
    }

    if (!dto.homeTeam || dto.homeTeam.id === null || dto.homeTeam.id === undefined) {
      throw new Error('Match home team is required');
    }

    if (!dto.awayTeam || dto.awayTeam.id === null || dto.awayTeam.id === undefined) {
      throw new Error('Match away team is required');
    }

    const homeTeamExternalId = String(dto.homeTeam.id).trim();
    const awayTeamExternalId = String(dto.awayTeam.id).trim();

    if (homeTeamExternalId === awayTeamExternalId) {
      throw new Error('Match home team and away team cannot be the same');
    }

    const externalId = String(dto.id).trim();
    if (externalId === '') {
      throw new Error('Cannot map invalid or empty match ID');
    }

    let matchDate: Date | null = null;
    if (dto.utcDate) {
      const parsedDate = new Date(dto.utcDate);
      if (!isNaN(parsedDate.getTime())) {
        matchDate = parsedDate;
      }
    }

    const rawStatus = dto.status ? String(dto.status).trim().toUpperCase() : 'SCHEDULED';
    const status = this.normalizeStatus(rawStatus);

    let homeScore: number | null = null;
    let awayScore: number | null = null;
    if (dto.score && dto.score.fullTime) {
      if (typeof dto.score.fullTime.home === 'number') {
        homeScore = dto.score.fullTime.home;
      }
      if (typeof dto.score.fullTime.away === 'number') {
        awayScore = dto.score.fullTime.away;
      }
    }

    const matchday =
      dto.matchday !== null && dto.matchday !== undefined && !isNaN(Number(dto.matchday))
        ? Number(dto.matchday)
        : null;

    const venue =
      (dto as any).venue !== null && (dto as any).venue !== undefined
        ? String((dto as any).venue).trim() || null
        : null;

    let dataUpdatedAt: Date | null = null;
    if (dto.lastUpdated) {
      const parsedUpdated = new Date(dto.lastUpdated);
      if (!isNaN(parsedUpdated.getTime())) {
        dataUpdatedAt = parsedUpdated;
      }
    }

    let competitionExternalId: string | null = null;
    let seasonExternalId: string | null = null;
    const detailDto = dto as ExternalMatchDetailDto;
    if (
      detailDto.competition &&
      detailDto.competition.id !== undefined &&
      detailDto.competition.id !== null
    ) {
      competitionExternalId = String(detailDto.competition.id).trim();
    }
    if (
      detailDto.season &&
      detailDto.season.id !== undefined &&
      detailDto.season.id !== null
    ) {
      seasonExternalId = String(detailDto.season.id).trim();
    }

    return {
      externalProvider: provider,
      externalId,
      matchDate,
      status,
      matchday,
      homeScore,
      awayScore,
      dataUpdatedAt,
      venue,
      competitionExternalId,
      seasonExternalId,
      homeTeamExternalId,
      awayTeamExternalId,
    };
  }

  /**
   * Normalizes external match status into standard ScoutBoard match status
   */
  private static normalizeStatus(rawStatus: string): string {
    switch (rawStatus) {
      case 'FINISHED':
      case 'AWARDED':
      case 'IN_PLAY':
      case 'PAUSED':
      case 'POSTPONED':
      case 'SUSPENDED':
      case 'CANCELLED':
      case 'TIMED':
      case 'SCHEDULED':
        return rawStatus;
      default:
        return 'SCHEDULED';
    }
  }

  /**
   * Transforms an ExternalMatchListDto into an array of TransformedMatch
   */
  static toTransformedMatchList(
    listDto: ExternalMatchListDto,
    provider: string = this.DEFAULT_PROVIDER,
  ): TransformedMatch[] {
    if (!listDto || !Array.isArray(listDto.matches)) {
      return [];
    }

    const seenIds = new Set<string>();
    const result: TransformedMatch[] = [];

    for (const raw of listDto.matches) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const extId = String(raw.id).trim();
      if (seenIds.has(extId)) {
        continue;
      }
      try {
        const transformed = this.toTransformedMatch(raw, provider);
        seenIds.add(extId);
        result.push(transformed);
      } catch {
        // Skip invalid match gracefully in batch
      }
    }

    return result;
  }
}
