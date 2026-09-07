import {
  ApiFootballPlayerItemDto,
  ApiFootballPlayerProfileDto,
  ApiFootballSquadPlayerDto,
} from '../dto/api-football-player.dto';
import { TransformedPlayer } from '../../domain/models/transformed-player.model';
import {
  normalizeToCanonicalPosition,
  PositionInferenceContext,
} from '../../../players/domain/enums/player-position.enum';

export interface EnrichedPlayerProfile {
  externalId: string;
  name: string;
  normalizedName: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  heightCm: number | null;
  weightKg: number | null;
  primaryPosition: string | null;
  shirtNumber: number | null;
  imageUrl: string | null;
}

export class ApiFootballPlayerMapper {
  private static readonly PROVIDER = 'API_FOOTBALL';

  /**
   * Normalizes a name by removing diacritics and accents, converting to lowercase
   */
  static normalizeName(name: string): string {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parses height string (e.g. "183 cm" or "183cm") to integer in cm
   */
  static parseHeightCm(heightStr?: string | null): number | null {
    if (!heightStr) return null;
    const match = String(heightStr).match(/(\d+)\s*(?:cm)?/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      return !isNaN(val) && val > 50 && val < 250 ? val : null;
    }
    return null;
  }

  /**
   * Parses weight string (e.g. "72 kg" or "72kg") to integer in kg
   */
  static parseWeightKg(weightStr?: string | null): number | null {
    if (!weightStr) return null;
    const match = String(weightStr).match(/(\d+)\s*(?:kg)?/i);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      return !isNaN(val) && val > 30 && val < 200 ? val : null;
    }
    return null;
  }

  /**
   * Normalizes position string to canonical ScoutBoard football position codes
   */
  static normalizePosition(
    pos?: string | null,
    context?: PositionInferenceContext,
  ): string | null {
    return normalizeToCanonicalPosition(pos, context);
  }

  /**
   * Transforms an ApiFootballPlayerItemDto into TransformedPlayer
   */
  static toTransformedPlayer(
    dto: ApiFootballPlayerItemDto,
    teamExternalId?: string | null,
  ): TransformedPlayer {
    const profile = dto.player;
    if (!profile || profile.id === null || profile.id === undefined) {
      throw new Error(
        'Cannot map invalid or empty API-Football player profile',
      );
    }

    const rawName = String(profile.name || '').trim();
    if (!rawName) {
      throw new Error('Player name is required');
    }

    const extId = String(profile.id).trim();
    const heightCm = this.parseHeightCm(profile.height);
    const weightKg = this.parseWeightKg(profile.weight);
    const imageUrl = profile.photo ? String(profile.photo).trim() : null;

    // Extract statistics if present
    const firstStat =
      Array.isArray(dto.statistics) && dto.statistics.length > 0
        ? dto.statistics[0]
        : undefined;

    const shirtNumber =
      firstStat?.games?.number !== undefined &&
      firstStat?.games?.number !== null
        ? firstStat.games.number
        : null;

    const rawPosition = (firstStat?.games?.position || profile.position || null)
      ? String(firstStat?.games?.position || profile.position).trim()
      : null;
    const primaryPosition = this.normalizePosition(rawPosition);

    const resolvedTeamExtId =
      teamExternalId ||
      (firstStat?.team?.id !== undefined && firstStat?.team?.id !== null
        ? String(firstStat.team.id)
        : null);

    return {
      externalProvider: this.PROVIDER,
      externalId: extId,
      name: rawName,
      normalizedName: this.normalizeName(rawName) || null,
      shortName: profile.lastname
        ? profile.lastname.trim()
        : profile.firstname
          ? profile.firstname.trim()
          : null,
      dateOfBirth: profile.birth?.date
        ? String(profile.birth.date).trim()
        : null,
      nationality: profile.nationality ? profile.nationality.trim() : null,
      heightCm,
      weightKg,
      rawPosition,
      primaryPosition,
      shirtNumber,
      imageUrl,
      status: profile.injured ? 'INJURED' : 'ACTIVE',
      dataUpdatedAt: new Date(),
      currentTeamExternalId: resolvedTeamExtId,
    };
  }

  /**
   * Extracts EnrichedPlayerProfile for enrichment use cases
   */
  static toEnrichedProfile(
    dto: ApiFootballPlayerItemDto,
  ): EnrichedPlayerProfile {
    const profile = dto.player;
    const firstStat =
      Array.isArray(dto.statistics) && dto.statistics.length > 0
        ? dto.statistics[0]
        : undefined;

    return {
      externalId: String(profile.id),
      name: profile.name,
      normalizedName: this.normalizeName(profile.name),
      firstName: profile.firstname || null,
      lastName: profile.lastname || null,
      dateOfBirth: profile.birth?.date || null,
      nationality: profile.nationality || null,
      heightCm: this.parseHeightCm(profile.height),
      weightKg: this.parseWeightKg(profile.weight),
      primaryPosition: this.normalizePosition(firstStat?.games?.position),
      shirtNumber:
        firstStat?.games?.number !== undefined &&
        firstStat?.games?.number !== null
          ? firstStat.games.number
          : null,
      imageUrl: profile.photo || null,
    };
  }

  /**
   * Transforms squad player from /players/squads endpoint
   */
  static fromSquadPlayer(
    squadPlayer: ApiFootballSquadPlayerDto,
  ): EnrichedPlayerProfile {
    return {
      externalId: String(squadPlayer.id),
      name: squadPlayer.name,
      normalizedName: this.normalizeName(squadPlayer.name),
      heightCm: null,
      weightKg: null,
      primaryPosition: this.normalizePosition(squadPlayer.position),
      shirtNumber:
        typeof squadPlayer.number === 'number' ? squadPlayer.number : null,
      imageUrl: squadPlayer.photo || null,
    };
  }

  /**
   * Transforms squad player from /players/squads endpoint to TransformedPlayer
   */
  static toTransformedPlayerFromSquad(
    squadPlayer: ApiFootballSquadPlayerDto,
    teamExternalId: string,
  ): TransformedPlayer {

    if (!squadPlayer?.id || !squadPlayer?.name) {
      throw new Error('Invalid squad player: missing id or name');
    }
    const rawName = squadPlayer.name.trim();
    const rawPosition = squadPlayer.position ? squadPlayer.position.trim() : null;
    return {
      externalProvider: this.PROVIDER,
      externalId: String(squadPlayer.id),
      name: rawName,
      normalizedName: this.normalizeName(rawName) || null,
      shortName: null,
      dateOfBirth: null,
      nationality: null,
      heightCm: null,
      weightKg: null,
      rawPosition,
      primaryPosition: this.normalizePosition(rawPosition),
      shirtNumber:
        typeof squadPlayer.number === 'number' ? squadPlayer.number : null,
      imageUrl: squadPlayer.photo || null,
      status: 'ACTIVE',
      dataUpdatedAt: new Date(),
      currentTeamExternalId: teamExternalId,
    };
  }

  /**
   * Transforms player from /players/profiles?player={id} endpoint
   */
  static fromSingleProfile(p: any): EnrichedPlayerProfile {
    if (!p?.id) {
      throw new Error('Invalid player profile: missing id');
    }
    const rawName = String(p.name || '').trim();
    return {
      externalId: String(p.id),
      name: rawName,
      normalizedName: this.normalizeName(rawName),
      firstName: p.firstname ? String(p.firstname).trim() : null,
      lastName: p.lastname ? String(p.lastname).trim() : null,
      dateOfBirth: p.birth?.date ? String(p.birth.date).trim() : null,
      nationality: p.nationality ? String(p.nationality).trim() : null,
      heightCm: this.parseHeightCm(p.height),
      weightKg: this.parseWeightKg(p.weight),
      primaryPosition: this.normalizePosition(p.position),
      shirtNumber: typeof p.number === 'number' ? p.number : null,
      imageUrl: p.photo ? String(p.photo).trim() : null,
    };
  }
}

