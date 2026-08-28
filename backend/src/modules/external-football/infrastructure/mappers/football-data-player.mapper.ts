import {
  ExternalPlayerDto,
  ExternalPlayerDetailDto,
  ExternalPlayerListDto,
} from '../dto/external-player.dto';
import { TransformedPlayer } from '../../domain/models/transformed-player.model';

export class FootballDataPlayerMapper {
  private static readonly DEFAULT_PROVIDER = 'FOOTBALL_DATA_ORG';

  /**
   * Normalizes a name by removing diacritics and accents, converting to lowercase
   */
  private static normalizeName(name: string): string {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Transforms an ExternalPlayerDto or ExternalPlayerDetailDto into TransformedPlayer
   */
  static toTransformedPlayer(
    dto: ExternalPlayerDto | ExternalPlayerDetailDto,
    provider: string = this.DEFAULT_PROVIDER,
    currentTeamExternalId?: string | null,
  ): TransformedPlayer {
    if (!dto || dto.id === null || dto.id === undefined) {
      throw new Error('Cannot map invalid or empty player DTO');
    }

    const rawName = String(dto.name || '').trim();
    if (!rawName) {
      throw new Error('Player name is required');
    }

    const externalId = String(dto.id).trim();
    const shortName = dto.lastName
      ? dto.lastName.trim()
      : dto.firstName
        ? dto.firstName.trim()
        : null;

    let position = dto.position ? String(dto.position).trim() : null;
    if (!position && dto.section) {
      position = String(dto.section).trim();
    }

    let resolvedTeamExtId: string | null = currentTeamExternalId || null;
    const detailDto = dto as ExternalPlayerDetailDto;
    if (detailDto.currentTeam && detailDto.currentTeam.id !== undefined && detailDto.currentTeam.id !== null) {
      resolvedTeamExtId = String(detailDto.currentTeam.id);
    }

    return {
      externalProvider: provider,
      externalId,
      name: rawName,
      normalizedName: this.normalizeName(rawName) || null,
      shortName,
      dateOfBirth: dto.dateOfBirth ? String(dto.dateOfBirth).trim() : null,
      nationality: dto.nationality ? String(dto.nationality).trim() : null,
      heightCm: null,
      weightKg: null,
      preferredFoot: null,
      primaryPosition: position,
      shirtNumber: typeof dto.shirtNumber === 'number' ? dto.shirtNumber : null,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: dto.lastUpdated ? new Date(dto.lastUpdated) : null,
      currentTeamExternalId: resolvedTeamExtId,
    };
  }

  /**
   * Transforms an ExternalPlayerListDto into an array of TransformedPlayer
   */
  static toTransformedPlayerList(
    listDto: ExternalPlayerListDto,
    provider: string = this.DEFAULT_PROVIDER,
    currentTeamExternalId?: string | null,
  ): TransformedPlayer[] {
    if (!listDto || !Array.isArray(listDto.players)) {
      return [];
    }

    const seenIds = new Set<string>();
    const result: TransformedPlayer[] = [];

    for (const raw of listDto.players) {
      if (!raw || raw.id === null || raw.id === undefined) {
        continue;
      }
      const extId = String(raw.id).trim();
      if (seenIds.has(extId)) {
        continue;
      }
      try {
        const transformed = this.toTransformedPlayer(raw, provider, currentTeamExternalId);
        seenIds.add(extId);
        result.push(transformed);
      } catch {
        // Skip invalid player items gracefully
      }
    }

    return result;
  }
}
