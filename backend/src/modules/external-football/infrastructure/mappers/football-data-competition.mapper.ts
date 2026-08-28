import {
  ExternalCompetitionDto,
  ExternalCompetitionDetailDto,
  ExternalCompetitionListDto,
  ExternalSeasonDto,
} from '../dto/external-competition.dto';
import {
  TransformedCompetition,
  TransformedSeason,
} from '../../domain/models/transformed-competition.model';
import { ExternalFootballInvalidResponseError } from '../../domain/errors/external-football.errors';

export const FOOTBALL_DATA_ORG_PROVIDER = 'FOOTBALL_DATA_ORG';

export class FootballDataCompetitionMapper {
  /**
   * Transforms a single ExternalCompetitionDto or ExternalCompetitionDetailDto to TransformedCompetition
   */
  static toTransformedCompetition(
    raw: ExternalCompetitionDto | ExternalCompetitionDetailDto | null | undefined,
  ): TransformedCompetition {
    if (!raw || typeof raw !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Cannot transform null or undefined competition payload',
        FOOTBALL_DATA_ORG_PROVIDER,
      );
    }

    if (raw.id === null || raw.id === undefined || String(raw.id).trim() === '') {
      throw new ExternalFootballInvalidResponseError(
        'Competition missing required id field',
        FOOTBALL_DATA_ORG_PROVIDER,
      );
    }

    if (raw.name === null || raw.name === undefined || String(raw.name).trim() === '') {
      throw new ExternalFootballInvalidResponseError(
        'Competition missing required name field',
        FOOTBALL_DATA_ORG_PROVIDER,
      );
    }

    const externalId = String(raw.id).trim();
    const name = String(raw.name).trim();
    const code = raw.code && typeof raw.code === 'string' && raw.code.trim() !== ''
      ? raw.code.trim()
      : null;

    const country = raw.area && raw.area.name && typeof raw.area.name === 'string' && raw.area.name.trim() !== ''
      ? raw.area.name.trim()
      : null;

    const type = raw.type && typeof raw.type === 'string' && raw.type.trim() !== ''
      ? raw.type.trim()
      : null;

    const logoUrl = raw.emblem && typeof raw.emblem === 'string' && raw.emblem.trim() !== ''
      ? raw.emblem.trim()
      : null;

    let dataUpdatedAt: Date | null = null;
    if (raw.lastUpdated && typeof raw.lastUpdated === 'string') {
      const parsed = new Date(raw.lastUpdated);
      if (!isNaN(parsed.getTime())) {
        dataUpdatedAt = parsed;
      }
    }

    const currentSeason = raw.currentSeason
      ? this.toTransformedSeason(raw.currentSeason, true, raw.name)
      : null;

    const seasonsList = (raw as ExternalCompetitionDetailDto).seasons;
    const seasons: TransformedSeason[] = [];

    if (Array.isArray(seasonsList)) {
      const seenIds = new Set<string>();
      for (const s of seasonsList) {
        if (s && s.id !== undefined && s.id !== null) {
          const sId = String(s.id).trim();
          if (!seenIds.has(sId)) {
            seenIds.add(sId);
            const isCurrent = currentSeason ? sId === currentSeason.externalId : false;
            const transformed = this.toTransformedSeason(s, isCurrent, raw.name);
            if (transformed) {
              seasons.push(transformed);
            }
          }
        }
      }
    } else if (currentSeason) {
      seasons.push(currentSeason);
    }

    return {
      externalProvider: FOOTBALL_DATA_ORG_PROVIDER,
      externalId,
      name,
      code,
      country,
      type,
      logoUrl,
      dataUpdatedAt,
      currentSeason,
      seasons,
    };
  }

  /**
   * Transforms a list of external competitions
   */
  static toTransformedCompetitionList(
    rawList: ExternalCompetitionListDto | null | undefined,
  ): TransformedCompetition[] {
    if (!rawList || !Array.isArray(rawList.competitions)) {
      return [];
    }

    return rawList.competitions
      .filter((comp) => comp && comp.id !== null && comp.id !== undefined)
      .map((comp) => this.toTransformedCompetition(comp));
  }

  /**
   * Transforms an ExternalSeasonDto to TransformedSeason
   */
  static toTransformedSeason(
    rawSeason: ExternalSeasonDto | null | undefined,
    isCurrent: boolean = false,
    competitionName?: string,
  ): TransformedSeason | null {
    if (!rawSeason || rawSeason.id === null || rawSeason.id === undefined) {
      return null;
    }

    const externalId = String(rawSeason.id).trim();
    const startDate = rawSeason.startDate && typeof rawSeason.startDate === 'string' && rawSeason.startDate.trim() !== ''
      ? rawSeason.startDate.trim()
      : null;

    const endDate = rawSeason.endDate && typeof rawSeason.endDate === 'string' && rawSeason.endDate.trim() !== ''
      ? rawSeason.endDate.trim()
      : null;

    // Derive seasonCode (e.g. "2024-2025" or "2024")
    let seasonCode = '';
    const yearRegex = /^\d{4}/;

    if (startDate && yearRegex.test(startDate)) {
      const startYear = startDate.substring(0, 4);
      const endYear = endDate && yearRegex.test(endDate) ? endDate.substring(0, 4) : '';

      if (startYear && endYear && startYear !== endYear) {
        seasonCode = `${startYear}-${endYear}`;
      } else if (startYear) {
        seasonCode = startYear;
      }
    }

    if (!seasonCode) {
      seasonCode = externalId;
    }

    const name = competitionName && seasonCode
      ? `${competitionName} ${seasonCode}`
      : `Season ${seasonCode}`;

    const currentMatchday = typeof rawSeason.currentMatchday === 'number'
      ? rawSeason.currentMatchday
      : null;

    return {
      externalProvider: FOOTBALL_DATA_ORG_PROVIDER,
      externalId,
      seasonCode,
      name,
      startDate,
      endDate,
      isCurrent,
      currentMatchday,
    };
  }
}
