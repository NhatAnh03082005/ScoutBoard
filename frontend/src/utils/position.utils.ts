export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface PositionRoleInfo {
  category: PositionCategory;
  label: string;
  cssClass: string;
  badgeClass: string;
  hexColor: string;
  lightBg: string;
  lightText: string;
}

const GK_POSITIONS = new Set(['GK']);
const DEF_POSITIONS = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB', 'WB']);
const MID_POSITIONS = new Set(['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM']);
const ATT_POSITIONS = new Set(['ST', 'CF', 'LW', 'RW', 'FW']);

export function getPositionCategory(posCode?: string | null): PositionCategory {
  if (!posCode) return 'MID';
  const upper = posCode.trim().toUpperCase();
  if (GK_POSITIONS.has(upper)) return 'GK';
  if (DEF_POSITIONS.has(upper)) return 'DEF';
  if (MID_POSITIONS.has(upper)) return 'MID';
  if (ATT_POSITIONS.has(upper)) return 'ATT';
  return 'MID';
}

export function getPositionRoleInfo(posCode?: string | null): PositionRoleInfo {
  const category = getPositionCategory(posCode);

  switch (category) {
    case 'GK':
      return {
        category: 'GK',
        label: 'Goalkeeper',
        cssClass: 'scout-pos-gk',
        badgeClass: 'scout-badge-gk',
        hexColor: '#10b981', // Green
        lightBg: '#dcfce7',
        lightText: '#15803d',
      };
    case 'DEF':
      return {
        category: 'DEF',
        label: 'Defender',
        cssClass: 'scout-pos-def',
        badgeClass: 'scout-badge-def',
        hexColor: '#3b82f6', // Blue
        lightBg: '#dbeafe',
        lightText: '#1d4ed8',
      };
    case 'MID':
      return {
        category: 'MID',
        label: 'Midfielder',
        cssClass: 'scout-pos-mid',
        badgeClass: 'scout-badge-mid',
        hexColor: '#f59e0b', // Yellow / Amber
        lightBg: '#fef3c7',
        lightText: '#b45309',
      };
    case 'ATT':
      return {
        category: 'ATT',
        label: 'Forward',
        cssClass: 'scout-pos-att',
        badgeClass: 'scout-badge-att',
        hexColor: '#ef4444', // Red
        lightBg: '#fee2e2',
        lightText: '#b91c1c',
      };
  }
}
