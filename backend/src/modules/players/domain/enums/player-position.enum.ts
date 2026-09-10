/**
 * Official Canonical Player Positions Contract for ScoutBoard
 * Specific canonical positions + broad role fallbacks.
 */
export const CANONICAL_PLAYER_POSITIONS = [
  'GK',
  'LB',
  'CB',
  'RB',
  'LWB',
  'RWB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
  'DEF',
  'MID',
  'FWD',
] as const;

export type PlayerPosition = (typeof CANONICAL_PLAYER_POSITIONS)[number];

export function isCanonicalPlayerPosition(pos: unknown): pos is PlayerPosition {
  if (typeof pos !== 'string') return false;
  return (CANONICAL_PLAYER_POSITIONS as readonly string[]).includes(
    pos.trim().toUpperCase(),
  );
}

export type PositionGroup =
  'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

/**
 * Maps any position code into its corresponding high-level Position Group
 * Note: Position Group is for filtering, segmentation & radar profiles.
 * It NEVER overwrites the detailed Player Position.
 */
export function getPositionGroup(pos?: string | null): PositionGroup | null {
  if (!pos) return null;
  const p = pos.trim().toUpperCase();
  if (['GK', 'GOALKEEPER', 'G'].includes(p)) return 'GOALKEEPER';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'DEFENDER', 'D'].includes(p))
    return 'DEFENDER';
  if (
    [
      'CDM',
      'DM',
      'CM',
      'CAM',
      'AM',
      'LM',
      'RM',
      'MID',
      'MIDFIELDER',
      'M',
    ].includes(p)
  )
    return 'MIDFIELDER';
  if (
    [
      'LW',
      'RW',
      'ST',
      'CF',
      'SS',
      'FWD',
      'ATT',
      'ATTACKER',
      'FORWARD',
      'F',
    ].includes(p)
  )
    return 'FORWARD';
  return null;
}

export interface PositionInferenceContext {
  grid?: string | null; // e.g. "1:1" (GK), "2:1" (LB), "2:4" (RB), "3:1" (DM), "4:2" (CAM)
  formation?: string | null; // e.g. "4-2-3-1", "4-3-3"
  side?: 'LEFT' | 'RIGHT' | 'CENTER' | null;
}

/**
 * Position Normalizer & Inference:
 * Tier 1: Exact provider detailed position -> canonical code
 * Tier 2: Supporting evidence (lineup pitch grid, preferred foot, side)
 * Tier 3: Broad category preservation (DEF, MID, FWD) without forced reduction to CB/CM/ST
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

  // Direct canonical code or alias normalization
  if (clean === 'DM') return 'CDM';
  if (clean === 'AM') return 'CAM';
  if (clean === 'SS') return 'CF';

  if (
    isCanonicalPlayerPosition(clean) &&
    !['DEF', 'MID', 'FWD'].includes(clean)
  ) {
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
    case 'HOLDING MIDFIELDER':
      return 'CDM';

    // 7. Central Midfielder
    case 'CENTRAL MIDFIELD':
    case 'CENTRAL MIDFIELDER':
      return 'CM';

    // 8. Attacking Midfielder
    case 'ATTACKING MIDFIELD':
    case 'ATTACKING MIDFIELDER':
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

  // Wing back non-canonical aliases
  if (
    clean === 'FWB' ||
    clean === 'FULL-WING-BACK' ||
    clean === 'WING BACK' ||
    clean === 'WING-BACK' ||
    clean === 'WB'
  ) {
    const isLeft =
      context?.side === 'LEFT' ||
      (context?.grid &&
        (context.grid.endsWith(':1') || context.grid.endsWith(':2')));
    return isLeft ? 'LWB' : 'RWB';
  }

  // --- TIER 2: LINEUP GRID EVIDENCE (row:col in tactical formation) ---
  if (context?.grid) {
    const [rowStr, colStr] = context.grid.split(':');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    if (!isNaN(row) && !isNaN(col)) {
      if (row === 1) return 'GK';

      // Defensive line (row 2)
      if (row === 2) {
        if (col === 1) return 'LB';
        if (col === 4 || col === 5) return 'RB';
        return 'CB';
      }

      // Midfield & Attack lines
      if (row === 3) {
        // In 4-2-3-1 or 3-4-2-1
        if (col === 1) return context.side === 'LEFT' ? 'LM' : 'CDM';
        if (col === 2) return 'CDM';
        return 'CM';
      }

      if (row === 4) {
        if (col === 1) return 'LW';
        if (col === 2) return 'CAM';
        if (col === 3) return 'RW';
        return 'CAM';
      }

      if (row >= 5) {
        if (col === 1) return 'ST';
        if (col === 2) return 'CF';
        return 'ST';
      }
    }
  }

  // Side-based inference
  if (context?.side === 'LEFT') {
    if (['DEFENCE', 'DEFENDER', 'DEF', 'D'].includes(clean)) return 'LB';
    if (['MIDFIELD', 'MIDFIELDER', 'MID', 'M'].includes(clean)) return 'LM';
    if (
      ['OFFENCE', 'ATTACK', 'ATTACKER', 'FORWARD', 'FWD', 'F'].includes(clean)
    )
      return 'LW';
  }

  if (context?.side === 'RIGHT') {
    if (['DEFENCE', 'DEFENDER', 'DEF', 'D'].includes(clean)) return 'RB';
    if (['MIDFIELD', 'MIDFIELDER', 'MID', 'M'].includes(clean)) return 'RM';
    if (
      ['OFFENCE', 'ATTACK', 'ATTACKER', 'FORWARD', 'FWD', 'F'].includes(clean)
    )
      return 'RW';
  }

  // Broad category preservation: DO NOT FORCE TO CB/CM/ST
  if (['DEFENCE', 'DEFENDER', 'DEF', 'D'].includes(clean)) {
    return 'DEF';
  }

  if (['MIDFIELD', 'MIDFIELDER', 'MID', 'M'].includes(clean)) {
    // PRESERVE broad category: DO NOT FORCE TO CM
    return 'MID';
  }

  if (
    ['OFFENCE', 'ATTACK', 'ATTACKER', 'FORWARD', 'FWD', 'ATT', 'F'].includes(
      clean,
    )
  ) {
    // PRESERVE broad category: DO NOT FORCE TO ST
    return 'FWD';
  }

  return null;
}
