import type { SquadPlayerItem, SquadPlayerRole } from '../types/squad.types';

export interface FormationSlot {
  code: string;
  label: string;
  requiredPosition: string;
  displayRole?: string;
  aliases?: string[];
  x: number; // Percentage from left (0 to 100)
  y: number; // Percentage from top (0 to 100)
}

export interface FormationRow {
  name: string;
  slots: FormationSlot[];
}

export interface FormationDefinition {
  id: string;
  name: string;
  category: '3 ATB' | '4 ATB' | '5 ATB';
  description: string;
  composition: Record<string, number>;
  slots: FormationSlot[];
}

/**
 * Complete Single Source of Truth for Formations (34 Tactical Formations)
 * Coordinate System:
 * - Attackers: y: 12% - 25%
 * - Midfielders: y: 30% - 60%
 * - Defenders: y: 68% - 76%
 * - Goalkeeper: y: 88% - 90%
 */
export const FORMATION_DEFINITIONS: Record<string, FormationDefinition> = {
  '4-3-3 Attack': {
    id: '4-3-3 Attack',
    name: '4-3-3 Attack',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CM, 1 CAM, LW, ST, RW',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CM": 2, "CAM": 1, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 16 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 16 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 34 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 32, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 68, y: 48 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 3 CM, LW, ST, RW',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CM": 3, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 16 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 16 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 28, y: 46 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 46 },
      { code: 'CM-3', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 72, y: 46 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-5-1': {
    id: '4-5-1',
    name: '4-5-1',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CM, LM, RM, 2 CAM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CM": 1, "CAM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LCAM', aliases: ["CM"], x: 36, y: 32 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RCAM', aliases: ["CM"], x: 64, y: 32 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 44 },
      { code: 'CM', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 50 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 44 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-1-2-1-2 Wide': {
    id: '4-1-2-1-2 Wide',
    name: '4-1-2-1-2 Wide',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, LM, RM, 1 CAM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "LM": 1, "RM": 1, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 38, y: 14 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 62, y: 14 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 32 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 16, y: 44 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 84, y: 44 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 55 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-2-4': {
    id: '4-2-4',
    name: '4-2-4',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CM, LW, RW, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CM": 2, "LW": 1, "RW": 1, "ST": 2},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 14, y: 16 },
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 38, y: 13 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 62, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 86, y: 16 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 48 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-3 Defend': {
    id: '4-3-3 Defend',
    name: '4-3-3 Defend',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CDM, 1 CM, LW, ST, RW',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 2, "CM": 1, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 16 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 16 },
      { code: 'CM', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 40 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 34, y: 55 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 66, y: 55 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-3 False 9': {
    id: '4-3-3 False 9',
    name: '4-3-3 False 9',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, 2 CM, LW, RW, 1 CF',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "CM": 2, "LW": 1, "RW": 1, "CF": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 15 },
      { code: 'CF', label: 'CF', requiredPosition: 'CF', displayRole: 'CF', aliases: ["ST"], x: 50, y: 24 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 15 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 32, y: 42 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 68, y: 42 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 55 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-2-3-1 Narrow': {
    id: '4-2-3-1 Narrow',
    name: '4-2-3-1 Narrow',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CDM, 3 CAM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 2, "CAM": 3, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LAM', aliases: ["CM"], x: 24, y: 32 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 30 },
      { code: 'CAM-3', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RAM', aliases: ["CM"], x: 76, y: 32 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 53 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 53 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-5-1 Flat': {
    id: '4-5-1 Flat',
    name: '4-5-1 Flat',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, LM, 3 CM, RM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CM": 3, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 14 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 46 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 32, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 48 },
      { code: 'CM-3', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 68, y: 48 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 46 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-3 Holding': {
    id: '4-3-3 Holding',
    name: '4-3-3 Holding',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, 2 CM, LW, ST, RW',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "CM": 2, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 16 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 16 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 30, y: 44 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 54 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 70, y: 44 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-2-2-2': {
    id: '4-2-2-2',
    name: '4-2-2-2',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CDM, 2 CAM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 2, "CAM": 2, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LCAM', aliases: ["CM"], x: 24, y: 35 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RCAM', aliases: ["CM"], x: 76, y: 35 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 53 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 53 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-2-3-1 Wide': {
    id: '4-2-3-1 Wide',
    name: '4-2-3-1 Wide',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CDM, LM, RM, 1 CAM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 2, "LM": 1, "RM": 1, "CAM": 1, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 16, y: 36 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 32 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 84, y: 36 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 53 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 53 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-1-2': {
    id: '4-3-1-2',
    name: '4-3-1-2',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 3 CM, 1 CAM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CM": 3, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 14 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 14 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 32 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 28, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 52 },
      { code: 'CM-3', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 72, y: 50 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-1-2-1-2 Narrow': {
    id: '4-1-2-1-2 Narrow',
    name: '4-1-2-1-2 Narrow',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, 2 CM, 1 CAM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "CM": 2, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 14 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 14 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 32 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 32, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 68, y: 48 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 58 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '5-2-2-1': {
    id: '5-2-2-1',
    name: '5-2-2-1',
    category: '5 ATB',
    description: '1 GK, LWB, 3 CB, RWB, 2 CM, 2 CAM, 1 ST',
    composition: {"GK": 1, "LWB": 1, "CB": 3, "RWB": 1, "CM": 2, "CAM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LCAM', aliases: ["CM"], x: 34, y: 30 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RCAM', aliases: ["CM"], x: 66, y: 30 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 50 },
      { code: 'LWB', label: 'LWB', requiredPosition: 'LWB', displayRole: 'LWB', aliases: ["LB", "LM"], x: 14, y: 64 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 30, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 75 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 70, y: 74 },
      { code: 'RWB', label: 'RWB', requiredPosition: 'RWB', displayRole: 'RWB', aliases: ["RB", "RM"], x: 86, y: 64 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '5-2-1-2': {
    id: '5-2-1-2',
    name: '5-2-1-2',
    category: '5 ATB',
    description: '1 GK, LWB, 3 CB, RWB, 2 CM, 1 CAM, 2 ST',
    composition: {"GK": 1, "LWB": 1, "CB": 3, "RWB": 1, "CM": 2, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 14 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 14 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 32 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 50 },
      { code: 'LWB', label: 'LWB', requiredPosition: 'LWB', displayRole: 'LWB', aliases: ["LB", "LM"], x: 14, y: 64 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 30, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 75 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 70, y: 74 },
      { code: 'RWB', label: 'RWB', requiredPosition: 'RWB', displayRole: 'RWB', aliases: ["RB", "RM"], x: 86, y: 64 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    name: '4-1-4-1',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, LM, 2 CM, RM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "LM": 1, "RM": 1, "CM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 42 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 36, y: 44 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 64, y: 44 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 42 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 56 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '5-3-2': {
    id: '5-3-2',
    name: '5-3-2',
    category: '5 ATB',
    description: '1 GK, LWB, 3 CB, RWB, 3 CM, 2 ST',
    composition: {"GK": 1, "LWB": 1, "CB": 3, "RWB": 1, "CM": 3, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 14 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 14 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 28, y: 46 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 48 },
      { code: 'CM-3', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 72, y: 46 },
      { code: 'LWB', label: 'LWB', requiredPosition: 'LWB', displayRole: 'LWB', aliases: ["LB", "LM"], x: 14, y: 64 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 30, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 75 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 70, y: 74 },
      { code: 'RWB', label: 'RWB', requiredPosition: 'RWB', displayRole: 'RWB', aliases: ["RB", "RM"], x: 86, y: 64 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-4-2 Flat': {
    id: '4-4-2 Flat',
    name: '4-4-2 Flat',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, LM, 2 CM, RM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CM": 2, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 46 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 48 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 46 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-4-3 Flat': {
    id: '3-4-3 Flat',
    name: '3-4-3 Flat',
    category: '3 ATB',
    description: '1 GK, 3 CB, LM, 2 CM, RM, LW, ST, RW',
    composition: {"GK": 1, "CB": 3, "LM": 1, "RM": 1, "CM": 2, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 15 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 15 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 46 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 48 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 48 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 46 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-4-3 Diamond': {
    id: '3-4-3 Diamond',
    name: '3-4-3 Diamond',
    category: '3 ATB',
    description: '1 GK, 3 CB, 1 CDM, LM, RM, 1 CAM, LW, ST, RW',
    composition: {"GK": 1, "CB": 3, "CDM": 1, "LM": 1, "RM": 1, "CAM": 1, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 15 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 15 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 34 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 48 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 48 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 56 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-4-2 Holding': {
    id: '4-4-2 Holding',
    name: '4-4-2 Holding',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, LM, 2 CDM, RM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CDM": 2, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 45 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 53 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 53 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 45 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-4-1-1 Attack': {
    id: '4-4-1-1 Attack',
    name: '4-4-1-1 Attack',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, LM, 2 CM, RM, 1 CAM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CM": 2, "CAM": 1, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 28 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 48 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 36, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 64, y: 50 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 48 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-4-1-1 Flat': {
    id: '4-4-1-1 Flat',
    name: '4-4-1-1 Flat',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, LM, 2 CM, RM, 1 CF, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "LM": 1, "RM": 1, "CM": 2, "CF": 1, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CF', label: 'CF', requiredPosition: 'CF', displayRole: 'CF', aliases: ["ST"], x: 50, y: 28 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 48 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 36, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 64, y: 50 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 48 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-4-1-2': {
    id: '3-4-1-2',
    name: '3-4-1-2',
    category: '3 ATB',
    description: '1 GK, 3 CB, LM, 2 CM, RM, 1 CAM, 2 ST',
    composition: {"GK": 1, "CB": 3, "LM": 1, "RM": 1, "CM": 2, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 34 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 52 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 52 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 52 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 52 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '5-4-1 Holding': {
    id: '5-4-1 Holding',
    name: '5-4-1 Holding',
    category: '5 ATB',
    description: '1 GK, LWB, 3 CB, RWB, LM, 2 CDM, RM, 1 ST',
    composition: {"GK": 1, "LWB": 1, "CB": 3, "RWB": 1, "LM": 1, "RM": 1, "CDM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 14 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 16, y: 42 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 38, y: 50 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 62, y: 50 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 84, y: 42 },
      { code: 'LWB', label: 'LWB', requiredPosition: 'LWB', displayRole: 'LWB', aliases: ["LB", "LM"], x: 14, y: 64 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 30, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 75 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 70, y: 74 },
      { code: 'RWB', label: 'RWB', requiredPosition: 'RWB', displayRole: 'RWB', aliases: ["RB", "RM"], x: 86, y: 64 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '5-4-1 Defend': {
    id: '5-4-1 Defend',
    name: '5-4-1 Defend',
    category: '5 ATB',
    description: '1 GK, LWB, 3 CB, RWB, 2 CDM, LM, RM, 1 ST',
    composition: {"GK": 1, "LWB": 1, "CB": 3, "RWB": 1, "LM": 1, "RM": 1, "CDM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 14 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 16, y: 44 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 54 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 54 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 84, y: 44 },
      { code: 'LWB', label: 'LWB', requiredPosition: 'LWB', displayRole: 'LWB', aliases: ["LB", "LM"], x: 14, y: 66 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 30, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 75 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 70, y: 74 },
      { code: 'RWB', label: 'RWB', requiredPosition: 'RWB', displayRole: 'RWB', aliases: ["RB", "RM"], x: 86, y: 66 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-5-1-1': {
    id: '3-5-1-1',
    name: '3-5-1-1',
    category: '3 ATB',
    description: '1 GK, 3 CB, LM, 2 CM, RM, 1 CDM, 1 CF, 1 ST',
    composition: {"GK": 1, "CB": 3, "LM": 1, "RM": 1, "CDM": 1, "CM": 2, "CF": 1, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CF', label: 'CF', requiredPosition: 'CF', displayRole: 'CF', aliases: ["ST"], x: 50, y: 27 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 46 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 36, y: 45 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 64, y: 45 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 46 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 57 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2',
    category: '3 ATB',
    description: '1 GK, 3 CB, LM, 2 CDM, RM, 1 CAM, 2 ST',
    composition: {"GK": 1, "CB": 3, "LM": 1, "RM": 1, "CDM": 2, "CAM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 34 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 46 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 54 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 54 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 46 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-3-2-1': {
    id: '4-3-2-1',
    name: '4-3-2-1',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 3 CM, 2 CAM, 1 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CM": 3, "CAM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LCAM', aliases: ["CM"], x: 34, y: 30 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RCAM', aliases: ["CM"], x: 66, y: 30 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 28, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 52 },
      { code: 'CM-3', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 72, y: 50 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-4-2-1': {
    id: '3-4-2-1',
    name: '3-4-2-1',
    category: '3 ATB',
    description: '1 GK, 3 CB, LM, 2 CM, RM, 2 CAM, 1 ST',
    composition: {"GK": 1, "CB": 3, "LM": 1, "RM": 1, "CM": 2, "CAM": 2, "ST": 1},
    slots: [
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'CAM-1', label: 'CAM', requiredPosition: 'CAM', displayRole: 'LCAM', aliases: ["CM"], x: 34, y: 30 },
      { code: 'CAM-2', label: 'CAM', requiredPosition: 'CAM', displayRole: 'RCAM', aliases: ["CM"], x: 66, y: 30 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 48 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 50 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 50 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 48 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-2-1-3': {
    id: '4-2-1-3',
    name: '4-2-1-3',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 2 CDM, 1 CAM, LW, ST, RW',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 2, "CAM": 1, "LW": 1, "ST": 1, "RW": 1},
    slots: [
      { code: 'LW', label: 'LW', requiredPosition: 'LW', displayRole: 'LW', aliases: ["LM", "ST"], x: 18, y: 16 },
      { code: 'ST', label: 'ST', requiredPosition: 'ST', displayRole: 'ST', aliases: ["CF"], x: 50, y: 13 },
      { code: 'RW', label: 'RW', requiredPosition: 'RW', displayRole: 'RW', aliases: ["RM", "ST"], x: 82, y: 16 },
      { code: 'CAM', label: 'CAM', requiredPosition: 'CAM', displayRole: 'CAM', aliases: ["CM"], x: 50, y: 34 },
      { code: 'CDM-1', label: 'CDM', requiredPosition: 'CDM', displayRole: 'LDM', aliases: ["CM"], x: 36, y: 53 },
      { code: 'CDM-2', label: 'CDM', requiredPosition: 'CDM', displayRole: 'RDM', aliases: ["CM"], x: 64, y: 53 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '4-1-3-2': {
    id: '4-1-3-2',
    name: '4-1-3-2',
    category: '4 ATB',
    description: '1 GK, LB, 2 CB, RB, 1 CDM, LM, 1 CM, RM, 2 ST',
    composition: {"GK": 1, "LB": 1, "CB": 2, "RB": 1, "CDM": 1, "LM": 1, "RM": 1, "CM": 1, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 16, y: 42 },
      { code: 'CM', label: 'CM', requiredPosition: 'CM', displayRole: 'CM', aliases: ["CAM", "CDM"], x: 50, y: 42 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 84, y: 42 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 56 },
      { code: 'LB', label: 'LB', requiredPosition: 'LB', displayRole: 'LB', aliases: ["LWB", "CB"], x: 14, y: 73 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 38, y: 74 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 62, y: 74 },
      { code: 'RB', label: 'RB', requiredPosition: 'RB', displayRole: 'RB', aliases: ["RWB", "CB"], x: 86, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
  '3-1-4-2': {
    id: '3-1-4-2',
    name: '3-1-4-2',
    category: '3 ATB',
    description: '1 GK, 3 CB, 1 CDM, LM, 2 CM, RM, 2 ST',
    composition: {"GK": 1, "CB": 3, "CDM": 1, "LM": 1, "RM": 1, "CM": 2, "ST": 2},
    slots: [
      { code: 'ST-1', label: 'ST', requiredPosition: 'ST', displayRole: 'LS', aliases: ["CF"], x: 36, y: 15 },
      { code: 'ST-2', label: 'ST', requiredPosition: 'ST', displayRole: 'RS', aliases: ["CF"], x: 64, y: 15 },
      { code: 'LM', label: 'LM', requiredPosition: 'LM', displayRole: 'LM', aliases: ["LW", "LWB"], x: 14, y: 44 },
      { code: 'CM-1', label: 'CM', requiredPosition: 'CM', displayRole: 'LCM', aliases: ["CAM", "CDM"], x: 38, y: 46 },
      { code: 'CM-2', label: 'CM', requiredPosition: 'CM', displayRole: 'RCM', aliases: ["CAM", "CDM"], x: 62, y: 46 },
      { code: 'RM', label: 'RM', requiredPosition: 'RM', displayRole: 'RM', aliases: ["RW", "RWB"], x: 86, y: 44 },
      { code: 'CDM', label: 'CDM', requiredPosition: 'CDM', displayRole: 'CDM', aliases: ["CM"], x: 50, y: 57 },
      { code: 'CB-1', label: 'CB', requiredPosition: 'CB', displayRole: 'LCB', aliases: ["LB", "RB"], x: 26, y: 73 },
      { code: 'CB-2', label: 'CB', requiredPosition: 'CB', displayRole: 'CB', aliases: ["LB", "RB"], x: 50, y: 74 },
      { code: 'CB-3', label: 'CB', requiredPosition: 'CB', displayRole: 'RCB', aliases: ["LB", "RB"], x: 74, y: 73 },
      { code: 'GK', label: 'GK', requiredPosition: 'GK', displayRole: 'GK', aliases: [], x: 50, y: 89 },
    ],
  },
};

// Aliases for backward compatibility with previously stored squad formation codes
if (FORMATION_DEFINITIONS['4-4-2 Flat']) {
  FORMATION_DEFINITIONS['4-4-2'] = { ...FORMATION_DEFINITIONS['4-4-2 Flat'], id: '4-4-2' };
}
if (FORMATION_DEFINITIONS['4-2-3-1 Narrow']) {
  FORMATION_DEFINITIONS['4-2-3-1'] = { ...FORMATION_DEFINITIONS['4-2-3-1 Narrow'], id: '4-2-3-1' };
}
if (FORMATION_DEFINITIONS['3-4-3 Flat']) {
  FORMATION_DEFINITIONS['3-4-3'] = { ...FORMATION_DEFINITIONS['3-4-3 Flat'], id: '3-4-3' };
}

export const ALL_FORMATIONS_LIST: FormationDefinition[] = [
  FORMATION_DEFINITIONS['4-3-3 Attack'],
  FORMATION_DEFINITIONS['4-3-3'],
  FORMATION_DEFINITIONS['4-5-1'],
  FORMATION_DEFINITIONS['4-1-2-1-2 Wide'],
  FORMATION_DEFINITIONS['4-2-4'],
  FORMATION_DEFINITIONS['4-3-3 Defend'],
  FORMATION_DEFINITIONS['4-3-3 False 9'],
  FORMATION_DEFINITIONS['4-2-3-1 Narrow'],
  FORMATION_DEFINITIONS['4-5-1 Flat'],
  FORMATION_DEFINITIONS['4-3-3 Holding'],
  FORMATION_DEFINITIONS['4-2-2-2'],
  FORMATION_DEFINITIONS['4-2-3-1 Wide'],
  FORMATION_DEFINITIONS['4-3-1-2'],
  FORMATION_DEFINITIONS['4-1-2-1-2 Narrow'],
  FORMATION_DEFINITIONS['5-2-2-1'],
  FORMATION_DEFINITIONS['5-2-1-2'],
  FORMATION_DEFINITIONS['4-1-4-1'],
  FORMATION_DEFINITIONS['5-3-2'],
  FORMATION_DEFINITIONS['4-4-2 Flat'],
  FORMATION_DEFINITIONS['3-4-3 Flat'],
  FORMATION_DEFINITIONS['3-4-3 Diamond'],
  FORMATION_DEFINITIONS['4-4-2 Holding'],
  FORMATION_DEFINITIONS['4-4-1-1 Attack'],
  FORMATION_DEFINITIONS['4-4-1-1 Flat'],
  FORMATION_DEFINITIONS['3-4-1-2'],
  FORMATION_DEFINITIONS['5-4-1 Holding'],
  FORMATION_DEFINITIONS['5-4-1 Defend'],
  FORMATION_DEFINITIONS['3-5-1-1'],
  FORMATION_DEFINITIONS['3-5-2'],
  FORMATION_DEFINITIONS['4-3-2-1'],
  FORMATION_DEFINITIONS['3-4-2-1'],
  FORMATION_DEFINITIONS['4-2-1-3'],
  FORMATION_DEFINITIONS['4-1-3-2'],
  FORMATION_DEFINITIONS['3-1-4-2'],
];

export const CATEGORY_FORMATIONS = {
  '3 ATB': ALL_FORMATIONS_LIST.filter((f) => f.category === '3 ATB'),
  '4 ATB': ALL_FORMATIONS_LIST.filter((f) => f.category === '4 ATB'),
  '5 ATB': ALL_FORMATIONS_LIST.filter((f) => f.category === '5 ATB'),
};

// Descriptions mapping
export const FORMATION_DESCRIPTIONS: Record<string, string> = {};
for (const [key, def] of Object.entries(FORMATION_DEFINITIONS)) {
  FORMATION_DESCRIPTIONS[key] = def.description;
}

export const POPULAR_FORMATIONS: string[] = ALL_FORMATIONS_LIST.map((f) => f.id);

/**
 * FORMATION_CONFIGS maps formation codes to row-organized slots
 * Used by SquadDetailPage and legacy pitch renderers
 */
export const FORMATION_CONFIGS: Record<string, FormationRow[]> = {};

for (const [code, def] of Object.entries(FORMATION_DEFINITIONS)) {
  const attackers: FormationSlot[] = [];
  const midfielders: FormationSlot[] = [];
  const defenders: FormationSlot[] = [];
  const goalkeeper: FormationSlot[] = [];

  for (const slot of def.slots) {
    if (slot.requiredPosition === 'GK') {
      goalkeeper.push(slot);
    } else if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(slot.requiredPosition)) {
      defenders.push(slot);
    } else if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(slot.requiredPosition)) {
      midfielders.push(slot);
    } else {
      attackers.push(slot);
    }
  }

  const rows: FormationRow[] = [];
  if (attackers.length > 0) rows.push({ name: 'Attackers', slots: attackers });
  if (midfielders.length > 0) rows.push({ name: 'Midfielders', slots: midfielders });
  if (defenders.length > 0) rows.push({ name: 'Defenders', slots: defenders });
  if (goalkeeper.length > 0) rows.push({ name: 'Goalkeeper', slots: goalkeeper });

  FORMATION_CONFIGS[code] = rows;
}

/**
 * STRICT POSITION ELIGIBILITY
 * Rules:
 * - A player is ONLY eligible if:
 *   1. PRIMARY POSITION === REQUIRED POSITION (ST/CF equivalent)
 *   2. SECONDARY POSITION contains REQUIRED POSITION
 */
/**
 * Canonical position mapper for tactical formation slots.
 * Maps granular tactical role codes (LCM, RCM, LDM, RDM, LAM, RAM, LCB, RCB, LS, RS, LWB, RWB)
 * to their primary football position category.
 */
export function getCanonicalPosition(posCode?: string | null): string {
  if (!posCode) return 'CM';
  const u = posCode.trim().toUpperCase();
  if (['LCM', 'RCM', 'CM'].includes(u)) return 'CM';
  if (['LDM', 'RDM', 'CDM', 'DM'].includes(u)) return 'CDM';
  if (['LAM', 'RAM', 'LCAM', 'RCAM', 'CAM', 'AM'].includes(u)) return 'CAM';
  if (['LCB', 'RCB', 'CB'].includes(u)) return 'CB';
  if (['LS', 'RS', 'ST', 'CF', 'SS', 'FWD'].includes(u)) return 'ST';
  if (['LWB', 'LB'].includes(u)) return 'LB';
  if (['RWB', 'RB'].includes(u)) return 'RB';
  if (['LM', 'LW', 'LF'].includes(u)) return 'LM';
  if (['RM', 'RW', 'RF'].includes(u)) return 'RM';
  if (['GK', 'GOALKEEPER'].includes(u)) return 'GK';
  return u;
}

/**
 * Returns all position codes that can play in a required slot.
 */
export function getEligiblePositionCodes(requiredPosition?: string | null): string[] {
  if (!requiredPosition) return [];
  const u = requiredPosition.trim().toUpperCase();
  const canonical = getCanonicalPosition(u);

  const eligibleSet = new Set<string>([u, canonical]);

  switch (canonical) {
    case 'CM':
      ['CM', 'LCM', 'RCM', 'CDM', 'CAM', 'MID'].forEach((p) => eligibleSet.add(p));
      break;
    case 'CDM':
      ['CDM', 'LDM', 'RDM', 'DM', 'CM', 'MID'].forEach((p) => eligibleSet.add(p));
      break;
    case 'CAM':
      ['CAM', 'LAM', 'RAM', 'LCAM', 'RCAM', 'AM', 'CM', 'SS', 'MID'].forEach((p) => eligibleSet.add(p));
      break;
    case 'CB':
      ['CB', 'LCB', 'RCB', 'DEF'].forEach((p) => eligibleSet.add(p));
      break;
    case 'ST':
      ['ST', 'CF', 'LS', 'RS', 'SS', 'FWD', 'LW', 'RW'].forEach((p) => eligibleSet.add(p));
      break;
    case 'LB':
      ['LB', 'LWB', 'DEF'].forEach((p) => eligibleSet.add(p));
      break;
    case 'RB':
      ['RB', 'RWB', 'DEF'].forEach((p) => eligibleSet.add(p));
      break;
    case 'LM':
      ['LM', 'LW', 'LWB', 'CAM', 'MID', 'FWD'].forEach((p) => eligibleSet.add(p));
      break;
    case 'RM':
      ['RM', 'RW', 'RWB', 'CAM', 'MID', 'FWD'].forEach((p) => eligibleSet.add(p));
      break;
    case 'GK':
      ['GK', 'GOALKEEPER'].forEach((p) => eligibleSet.add(p));
      break;
    default:
      eligibleSet.add(canonical);
      break;
  }

  return Array.from(eligibleSet);
}

export function isPlayerEligibleForSlot(
  player: {
    primaryPosition?: string | null;
    secondaryPositions?: string[];
    positions?: Array<{ positionCode?: string; isPrimary?: boolean } | string>;
  } | null | undefined,
  requiredPosition: string,
): boolean {
  if (!player || !requiredPosition) return false;
  const eligibleCodes = getEligiblePositionCodes(requiredPosition);
  const targetCanonical = getCanonicalPosition(requiredPosition);

  // 1. Primary position check
  const primary = player.primaryPosition ? player.primaryPosition.trim().toUpperCase() : null;
  if (primary) {
    if (eligibleCodes.includes(primary) || getCanonicalPosition(primary) === targetCanonical) {
      return true;
    }
  }

  // 2. Positions array check (from DB or API)
  if (player.positions && Array.isArray(player.positions)) {
    const hasMatch = player.positions.some((p) => {
      const code = (typeof p === 'string' ? p : p.positionCode || '').trim().toUpperCase();
      return code && (eligibleCodes.includes(code) || getCanonicalPosition(code) === targetCanonical);
    });
    if (hasMatch) return true;
  }

  // 3. Secondary positions array check
  if (player.secondaryPositions && Array.isArray(player.secondaryPositions)) {
    const hasMatch = player.secondaryPositions.some((sec) => {
      const code = (sec || '').trim().toUpperCase();
      return code && (eligibleCodes.includes(code) || getCanonicalPosition(code) === targetCanonical);
    });
    if (hasMatch) return true;
  }

  return false;
}

export function isPlayerInSquad(players: SquadPlayerItem[], playerId: string): boolean {
  return players.some((p) => p.playerId === playerId);
}

export function findStarterForSlot(
  players: SquadPlayerItem[],
  slot: FormationSlot,
): SquadPlayerItem | undefined {
  return players.find(
    (p) =>
      p.role === 'STARTER' &&
      (p.slotCode === slot.code ||
        (slot.aliases && p.slotCode && slot.aliases.includes(p.slotCode))),
  );
}

export function applyMoveStarter(
  players: SquadPlayerItem[],
  playerId: string,
  targetSlotCode: string,
): {
  nextPlayers: SquadPlayerItem[];
  swappedPlayer?: SquadPlayerItem;
} {
  const targetOccupant = players.find(
    (p) => p.role === 'STARTER' && p.slotCode === targetSlotCode && p.playerId !== playerId,
  );
  const sourcePlayer = players.find((p) => p.playerId === playerId);
  const sourceSlotCode = sourcePlayer?.slotCode || null;

  const nextPlayers = players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'STARTER' as SquadPlayerRole,
        slotCode: targetSlotCode,
      };
    }
    if (targetOccupant && p.playerId === targetOccupant.playerId) {
      return {
        ...p,
        role: 'STARTER' as SquadPlayerRole,
        slotCode: sourceSlotCode,
      };
    }
    return p;
  });

  return { nextPlayers, swappedPlayer: targetOccupant };
}

export function applyStarterToBench(
  players: SquadPlayerItem[],
  playerId: string,
): SquadPlayerItem[] {
  return players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'SUBSTITUTE' as SquadPlayerRole,
        slotCode: null,
        isCaptain: false,
      };
    }
    return p;
  });
}

export function applyBenchToStarter(
  players: SquadPlayerItem[],
  playerId: string,
  targetSlotCode: string,
): {
  nextPlayers: SquadPlayerItem[];
  displacedStarter?: SquadPlayerItem;
} {
  const displacedStarter = players.find(
    (p) => p.role === 'STARTER' && p.slotCode === targetSlotCode && p.playerId !== playerId,
  );

  const nextPlayers = players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'STARTER' as SquadPlayerRole,
        slotCode: targetSlotCode,
      };
    }
    if (displacedStarter && p.playerId === displacedStarter.playerId) {
      return {
        ...p,
        role: 'SUBSTITUTE' as SquadPlayerRole,
        slotCode: null,
        isCaptain: false,
      };
    }
    return p;
  });

  return { nextPlayers, displacedStarter };
}

