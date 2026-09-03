export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'ATT' | 'NONE';

export interface PositionRoleInfo {
  category: PositionCategory;
  label: string;
  cssClass: string;
  badgeClass: string;
  hexColor: string;
  lightBg: string;
  lightText: string;
}

// Canonical-only sets — no legacy aliases
const GK_POSITIONS = new Set(['GK']);
const DEF_POSITIONS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID_POSITIONS = new Set(['CDM', 'CM', 'CAM', 'LM', 'RM']);
const ATT_POSITIONS = new Set(['ST', 'CF', 'LW', 'RW']);

/** Map a canonical position code to a display grouping category. */
export function getPositionCategory(posCode?: string | null): PositionCategory {
  if (!posCode || posCode.trim() === '' || posCode.trim() === '—') return 'NONE';
  const upper = posCode.trim().toUpperCase();
  if (GK_POSITIONS.has(upper)) return 'GK';
  if (DEF_POSITIONS.has(upper)) return 'DEF';
  if (MID_POSITIONS.has(upper)) return 'MID';
  if (ATT_POSITIONS.has(upper)) return 'ATT';
  return 'NONE';
}

/** Specific human-readable labels for every canonical position. */
const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper',
  LB: 'Left Back',
  CB: 'Centre Back',
  RB: 'Right Back',
  LWB: 'Left Wing Back',
  RWB: 'Right Wing Back',
  CDM: 'Defensive Mid',
  CM: 'Central Mid',
  CAM: 'Attacking Mid',
  LM: 'Left Mid',
  RM: 'Right Mid',
  LW: 'Left Winger',
  RW: 'Right Winger',
  CF: 'Centre Forward',
  ST: 'Striker',
};

export function getPositionRoleInfo(posCode?: string | null): PositionRoleInfo {
  const upper = posCode ? posCode.trim().toUpperCase() : '';
  const category = getPositionCategory(upper);
  const specificLabel = POSITION_LABELS[upper] ?? null;

  switch (category) {
    case 'GK':
      return {
        category: 'GK',
        label: specificLabel ?? 'Goalkeeper',
        cssClass: 'scout-pos-gk',
        badgeClass: 'scout-badge-gk',
        hexColor: '#10b981', // Green
        lightBg: '#dcfce7',
        lightText: '#15803d',
      };
    case 'DEF':
      return {
        category: 'DEF',
        label: specificLabel ?? 'Defender',
        cssClass: 'scout-pos-def',
        badgeClass: 'scout-badge-def',
        hexColor: '#3b82f6', // Blue
        lightBg: '#dbeafe',
        lightText: '#1d4ed8',
      };
    case 'MID':
      return {
        category: 'MID',
        label: specificLabel ?? 'Midfielder',
        cssClass: 'scout-pos-mid',
        badgeClass: 'scout-badge-mid',
        hexColor: '#f59e0b', // Yellow / Amber
        lightBg: '#fef3c7',
        lightText: '#b45309',
      };
    case 'ATT':
      return {
        category: 'ATT',
        label: specificLabel ?? 'Forward',
        cssClass: 'scout-pos-att',
        badgeClass: 'scout-badge-att',
        hexColor: '#ef4444', // Red
        lightBg: '#fee2e2',
        lightText: '#b91c1c',
      };
    case 'NONE':
    default:
      return {
        category: 'NONE',
        label: '—',
        cssClass: 'scout-pos-none',
        badgeClass: 'scout-badge-none',
        hexColor: '#64748b', // Neutral Slate
        lightBg: '#f1f5f9',
        lightText: '#475569',
      };
  }
}
