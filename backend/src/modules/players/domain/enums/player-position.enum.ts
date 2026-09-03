/**
 * Official Canonical Player Positions Contract for ScoutBoard
 * 15 canonical positions only.
 */
export const CANONICAL_PLAYER_POSITIONS = [
  'GK',
  'LB',
  'CB',
  'RB',
  'LWB',
  'RWB',
  'CM',
  'CDM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
] as const;

export type PlayerPosition = (typeof CANONICAL_PLAYER_POSITIONS)[number];

export function isCanonicalPlayerPosition(pos: unknown): pos is PlayerPosition {
  if (typeof pos !== 'string') return false;
  return (CANONICAL_PLAYER_POSITIONS as readonly string[]).includes(
    pos.trim().toUpperCase(),
  );
}

export interface PositionInferenceContext {
  preferredFoot?: string | null;
  grid?: string | null; // e.g. "1:1" (left), "1:4" (right) in API-Football lineup
  side?: 'LEFT' | 'RIGHT' | 'CENTER' | null;
}

/**
 * 3-Tier Position Normalizer & Inference:
 * Tier 1: Exact provider detailed position -> canonical code
 * Tier 2: Supporting evidence (preferred foot / lineup grid / side)
 * Tier 3: Semantic safe fallback (Defence -> CB, Midfield -> CM, Offence -> ST)
 * Tier 4: null if input is empty or invalid
 */
export function normalizeToCanonicalPosition(
  raw?: string | null,
  context?: PositionInferenceContext,
): PlayerPosition | null {
  if (!raw || typeof raw !== 'string') return null;

  const clean = raw
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, ' ');

  if (!clean || clean === 'UNKNOWN' || clean === 'N/A') return null;

  // If already a canonical code, return directly
  if (isCanonicalPlayerPosition(clean)) {
    return clean;
  }

  // --- TIER 1: EXACT MATCHES ---
  switch (clean) {
    // 1. Goalkeeper
    case 'GOALKEEPER':
    case 'G':
    case 'GOALIE':
    case 'KEEPER':
      return 'GK';

    // 2. Centre Back
    case 'CENTRE-BACK':
    case 'CENTRE BACK':
    case 'CENTER-BACK':
    case 'CENTER BACK':
    case 'CENTRAL DEFENDER':
    case 'CENTRE DEFENDER':
      return 'CB';

    // 3. Left Back
    case 'LEFT-BACK':
    case 'LEFT BACK':
    case 'LEFT DEFENDER':
      return 'LB';

    // 4. Right Back
    case 'RIGHT-BACK':
    case 'RIGHT BACK':
    case 'RIGHT DEFENDER':
      return 'RB';

    // 5. Wing Backs
    case 'LEFT WING-BACK':
    case 'LEFT WING BACK':
    case 'LEFT-WING-BACK':
      return 'LWB';
    case 'RIGHT WING-BACK':
    case 'RIGHT WING BACK':
    case 'RIGHT-WING-BACK':
      return 'RWB';

    // 6. Defensive Midfielder
    case 'DEFENSIVE MIDFIELD':
    case 'DEFENSIVE MIDFIELDER':
    case 'DM':
    case 'HOLDING MIDFIELDER':
      return 'CDM';

    // 7. Central Midfielder
    case 'CENTRAL MIDFIELD':
    case 'CENTRAL MIDFIELDER':
      return 'CM';

    // 8. Attacking Midfielder
    case 'ATTACKING MIDFIELD':
    case 'ATTACKING MIDFIELDER':
    case 'AM':
    case 'PLAYMAKER':
      return 'CAM';

    // 9. Wide Midfielders
    case 'LEFT MIDFIELD':
    case 'LEFT MIDFIELDER':
      return 'LM';
    case 'RIGHT MIDFIELD':
    case 'RIGHT MIDFIELDER':
      return 'RM';

    // 10. Wingers
    case 'LEFT WINGER':
    case 'LEFT WING':
      return 'LW';
    case 'RIGHT WINGER':
    case 'RIGHT WING':
      return 'RW';

    // 11. Centre Forwards & Strikers
    case 'CENTRE-FORWARD':
    case 'CENTRE FORWARD':
    case 'CENTER-FORWARD':
    case 'CENTER FORWARD':
    case 'SECOND STRIKER':
      return 'CF';
    case 'STRIKER':
      return 'ST';
  }

  // Check FWB non-canonical alias
  if (
    clean === 'FWB' ||
    clean === 'FULL-WING-BACK' ||
    clean === 'WING BACK' ||
    clean === 'WING-BACK' ||
    clean === 'WB'
  ) {
    const isLeft =
      context?.side === 'LEFT' ||
      context?.preferredFoot?.toUpperCase() === 'LEFT' ||
      (context?.grid &&
        (context.grid.endsWith(':1') || context.grid.endsWith(':2')));
    return isLeft ? 'LWB' : 'RWB';
  }

  // --- TIER 2 & 3: BROAD GROUPINGS WITH EVIDENCE / SAFE FALLBACK ---

  // DEFENCE / DEFENDER
  if (
    clean === 'DEFENCE' ||
    clean === 'DEFENDER' ||
    clean === 'DEF' ||
    clean === 'D' ||
    clean === 'DF'
  ) {
    if (
      context?.side === 'LEFT' ||
      context?.preferredFoot?.toUpperCase() === 'LEFT'
    ) {
      return 'LB';
    }
    if (
      context?.side === 'RIGHT' ||
      context?.preferredFoot?.toUpperCase() === 'RIGHT'
    ) {
      return 'RB';
    }
    // Safe semantic fallback
    return 'CB';
  }

  // MIDFIELD / MIDFIELDER
  if (
    clean === 'MIDFIELD' ||
    clean === 'MIDFIELDER' ||
    clean === 'MID' ||
    clean === 'M' ||
    clean === 'MF'
  ) {
    if (context?.side === 'LEFT') return 'LM';
    if (context?.side === 'RIGHT') return 'RM';
    // Safe semantic fallback
    return 'CM';
  }

  // OFFENCE / ATTACKER / FORWARD / ATTACK
  if (
    clean === 'OFFENCE' ||
    clean === 'ATTACK' ||
    clean === 'ATTACKER' ||
    clean === 'FORWARD' ||
    clean === 'FWD' ||
    clean === 'ATT' ||
    clean === 'F' ||
    clean === 'FW'
  ) {
    if (context?.side === 'LEFT') return 'LW';
    if (context?.side === 'RIGHT') return 'RW';
    // Safe semantic fallback
    return 'ST';
  }

  return null;
}
