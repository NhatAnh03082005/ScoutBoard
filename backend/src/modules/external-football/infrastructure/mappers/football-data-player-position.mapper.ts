import { TransformedPlayerPosition } from '../../domain/models/transformed-player-position.model';

export class FootballDataPlayerPositionMapper {
  private static readonly POSITION_MAP: Record<string, string> = {
    // Goalkeepers
    goalkeeper: 'GK',
    gk: 'GK',

    // Specific Defenders
    'centre-back': 'CB',
    'center-back': 'CB',
    cb: 'CB',
    'left-back': 'LB',
    lb: 'LB',
    'right-back': 'RB',
    rb: 'RB',
    'left wing-back': 'LWB',
    'left wing back': 'LWB',
    lwb: 'LWB',
    'right wing-back': 'RWB',
    'right wing back': 'RWB',
    rwb: 'RWB',

    // Specific Midfielders
    'defensive midfield': 'CDM',
    'defensive midfielder': 'CDM',
    cdm: 'CDM',
    dm: 'CDM',
    'central midfield': 'CM',
    'central midfielder': 'CM',
    cm: 'CM',
    'attacking midfield': 'CAM',
    'attacking midfielder': 'CAM',
    cam: 'CAM',
    am: 'CAM',
    'left midfield': 'LM',
    'left midfielder': 'LM',
    lm: 'LM',
    'right midfield': 'RM',
    'right midfielder': 'RM',
    rm: 'RM',

    // Specific Attackers & Wingers
    'left winger': 'LW',
    'left wing': 'LW',
    lw: 'LW',
    'right winger': 'RW',
    'right wing': 'RW',
    rw: 'RW',
    'centre-forward': 'ST',
    'center-forward': 'ST',
    striker: 'ST',
    st: 'ST',
    'second striker': 'CF',
    cf: 'CF',

    // Ambiguous General Categories (Fallback to core anchors)
    defence: 'CB',
    defender: 'CB',
    df: 'CB',
    midfield: 'CM',
    midfielder: 'CM',
    mf: 'CM',
    offence: 'ST',
    attack: 'ST',
    attacker: 'ST',
    forward: 'ST',
    fw: 'ST',
  };

  /**
   * Maps a raw provider position string to a standardized ScoutBoard position code.
   * Pure & deterministic. Returns null for unknown, empty, or invalid input.
   */
  static mapPosition(rawPosition?: string | null): string | null {
    if (!rawPosition || typeof rawPosition !== 'string') {
      return null;
    }

    const normalized = rawPosition.trim().toLowerCase();
    if (normalized === '' || normalized === 'unknown') {
      return null;
    }

    return this.POSITION_MAP[normalized] || null;
  }

  /**
   * Converts a raw provider position into a single primary TransformedPlayerPosition.
   * Returns null if playerExternalId or position is invalid.
   */
  static toTransformedPosition(
    playerExternalId: string | number,
    rawPosition?: string | null,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): TransformedPlayerPosition | null {
    if (
      playerExternalId === null ||
      playerExternalId === undefined ||
      String(playerExternalId).trim() === ''
    ) {
      return null;
    }

    const positionCode = this.mapPosition(rawPosition);
    if (!positionCode) {
      return null;
    }

    return {
      playerExternalId: String(playerExternalId).trim(),
      externalProvider: provider,
      positionCode,
      isPrimary: true,
    };
  }

  /**
   * Converts a raw provider position into a list of TransformedPlayerPosition.
   * Strictly returns at most ONE primary position. Zero secondary fabrication.
   */
  static toTransformedPositionList(
    playerExternalId: string | number,
    rawPosition?: string | null,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): TransformedPlayerPosition[] {
    const single = this.toTransformedPosition(
      playerExternalId,
      rawPosition,
      provider,
    );
    return single ? [single] : [];
  }
}
