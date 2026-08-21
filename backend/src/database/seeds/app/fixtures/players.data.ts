export interface PlayerStatRaw {
  mp: number;
  st: number;
  min: number;
  gl: number;
  ast: number;
  sh: number;
  sot: number;
  pass: number;
  acc: number;
  kp: number;
  tk: number;
  int: number;
  dw: number;
  yc: number;
  rc: number;
  saves?: number;
  gc?: number;
  cs?: number;
  ps?: number;
  pf?: number;
  savePct?: number;
}

export interface SeedPlayerData {
  extId: string;
  name: string;
  shortName?: string;
  dob: string;
  nationality: string;
  heightCm: number;
  weightKg?: number;
  foot: 'LEFT' | 'RIGHT' | 'BOTH';
  primaryPos: string;
  secondaryPos?: string;
  shirtNumber: number;

  // Current team (for 2025/26 season)
  currentTeamExtId: string;

  // Transfer history if player moved between 2024/25 and 2025/26
  transferInfo?: {
    oldTeamExtId: string;
    transferDate: string;
  };

  // Domestic Stats
  stats2024Domestic: PlayerStatRaw;
  stats2025Domestic: PlayerStatRaw;

  // Optional CL Stats
  stats2024CL?: PlayerStatRaw;
  stats2025CL?: PlayerStatRaw;
}

export const PLAYERS_DATA: SeedPlayerData[] = [];
