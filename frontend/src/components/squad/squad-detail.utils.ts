export function getSlotCategory(
  posCode?: string | null,
): 'attacker' | 'midfielder' | 'defender' | 'goalkeeper' {
  if (!posCode) return 'midfielder';
  const u = posCode.toUpperCase();
  if (['ST', 'CF', 'LW', 'RW', 'SS', 'FWD'].includes(u)) return 'attacker';
  if (['GK'].includes(u)) return 'goalkeeper';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(u)) return 'defender';
  return 'midfielder';
}

export function getCleanDisplayPosition(posCode?: string | null): string {
  if (!posCode) return 'POS';
  const u = posCode.toUpperCase();
  if (['LS', 'RS', 'CF', 'SS'].includes(u)) return 'ST';
  if (['LCB', 'RCB'].includes(u)) return 'CB';
  if (['LDM', 'RDM'].includes(u)) return 'CDM';
  if (['LCM', 'RCM'].includes(u)) return 'CM';
  if (['LAM', 'RAM'].includes(u)) return 'CAM';
  return u;
}

export function getPillBadgeColor(posCode?: string | null): string {
  const cat = getSlotCategory(posCode);
  switch (cat) {
    case 'attacker':
      return '#e11d48';
    case 'midfielder':
      return '#10b981';
    case 'defender':
      return '#2563eb';
    case 'goalkeeper':
      return '#f59e0b';
  }
}
