import type { SquadPlayerItem, SquadPlayerRole } from '../types/squad.types';

export interface FormationSlot {
  code: string;
  label: string;
  aliases?: string[];
}

export interface FormationRow {
  name: string;
  slots: FormationSlot[];
}

export const FORMATION_CONFIGS: Record<string, FormationRow[]> = {
  '4-3-3': [
    {
      name: 'Goalkeeper',
      slots: [{ code: 'GK', label: 'GK' }],
    },
    {
      name: 'Defenders',
      slots: [
        { code: 'LB', label: 'LB' },
        { code: 'CB-1', label: 'CB', aliases: ['LCB', 'CB'] },
        { code: 'CB-2', label: 'CB', aliases: ['RCB'] },
        { code: 'RB', label: 'RB' },
      ],
    },
    {
      name: 'Midfielders',
      slots: [
        { code: 'CM-1', label: 'LCM', aliases: ['LCM', 'LM'] },
        { code: 'CM-2', label: 'CM', aliases: ['CM', 'CAM', 'CDM'] },
        { code: 'CM-3', label: 'RCM', aliases: ['RCM', 'RM'] },
      ],
    },
    {
      name: 'Attackers',
      slots: [
        { code: 'LW', label: 'LW', aliases: ['LF'] },
        { code: 'ST', label: 'ST', aliases: ['CF'] },
        { code: 'RW', label: 'RW', aliases: ['RF'] },
      ],
    },
  ],
  '4-2-3-1': [
    {
      name: 'Goalkeeper',
      slots: [{ code: 'GK', label: 'GK' }],
    },
    {
      name: 'Defenders',
      slots: [
        { code: 'LB', label: 'LB' },
        { code: 'CB-1', label: 'CB', aliases: ['LCB', 'CB'] },
        { code: 'CB-2', label: 'CB', aliases: ['RCB'] },
        { code: 'RB', label: 'RB' },
      ],
    },
    {
      name: 'Defensive Midfielders',
      slots: [
        { code: 'DM-1', label: 'LDM', aliases: ['LDM', 'CDM-1', 'CM-1'] },
        { code: 'DM-2', label: 'RDM', aliases: ['RDM', 'CDM-2', 'CM-2'] },
      ],
    },
    {
      name: 'Attacking Midfielders',
      slots: [
        { code: 'LAM', label: 'LAM', aliases: ['LW', 'LM'] },
        { code: 'CAM', label: 'CAM', aliases: ['AM', 'CM-3'] },
        { code: 'RAM', label: 'RAM', aliases: ['RW', 'RM'] },
      ],
    },
    {
      name: 'Attackers',
      slots: [{ code: 'ST', label: 'ST', aliases: ['CF'] }],
    },
  ],
  '4-4-2': [
    {
      name: 'Goalkeeper',
      slots: [{ code: 'GK', label: 'GK' }],
    },
    {
      name: 'Defenders',
      slots: [
        { code: 'LB', label: 'LB' },
        { code: 'CB-1', label: 'CB', aliases: ['LCB', 'CB'] },
        { code: 'CB-2', label: 'CB', aliases: ['RCB'] },
        { code: 'RB', label: 'RB' },
      ],
    },
    {
      name: 'Midfielders',
      slots: [
        { code: 'LM', label: 'LM', aliases: ['LW', 'LCM'] },
        { code: 'CM-1', label: 'CM', aliases: ['CM', 'CDM'] },
        { code: 'CM-2', label: 'CM', aliases: ['CAM'] },
        { code: 'RM', label: 'RM', aliases: ['RW', 'RCM'] },
      ],
    },
    {
      name: 'Attackers',
      slots: [
        { code: 'ST-1', label: 'ST', aliases: ['LS', 'ST', 'CF-1'] },
        { code: 'ST-2', label: 'ST', aliases: ['RS', 'SS', 'CF-2'] },
      ],
    },
  ],
  '3-5-2': [
    {
      name: 'Goalkeeper',
      slots: [{ code: 'GK', label: 'GK' }],
    },
    {
      name: 'Defenders',
      slots: [
        { code: 'CB-1', label: 'LCB', aliases: ['LCB', 'LB'] },
        { code: 'CB-2', label: 'CB', aliases: ['CB'] },
        { code: 'CB-3', label: 'RCB', aliases: ['RCB', 'RB'] },
      ],
    },
    {
      name: 'Midfielders',
      slots: [
        { code: 'LWB', label: 'LWB', aliases: ['LM', 'LW'] },
        { code: 'CM-1', label: 'CM', aliases: ['LDM', 'LCM'] },
        { code: 'CM-2', label: 'CAM', aliases: ['CAM', 'CM'] },
        { code: 'CM-3', label: 'CM', aliases: ['RDM', 'RCM'] },
        { code: 'RWB', label: 'RWB', aliases: ['RM', 'RW'] },
      ],
    },
    {
      name: 'Attackers',
      slots: [
        { code: 'ST-1', label: 'ST', aliases: ['LS', 'ST', 'CF-1'] },
        { code: 'ST-2', label: 'ST', aliases: ['RS', 'SS', 'CF-2'] },
      ],
    },
  ],
  '3-4-3': [
    {
      name: 'Goalkeeper',
      slots: [{ code: 'GK', label: 'GK' }],
    },
    {
      name: 'Defenders',
      slots: [
        { code: 'CB-1', label: 'LCB', aliases: ['LCB', 'LB'] },
        { code: 'CB-2', label: 'CB', aliases: ['CB'] },
        { code: 'CB-3', label: 'RCB', aliases: ['RCB', 'RB'] },
      ],
    },
    {
      name: 'Midfielders',
      slots: [
        { code: 'LM', label: 'LM', aliases: ['LWB', 'LCM'] },
        { code: 'CM-1', label: 'CM', aliases: ['DM-1', 'CM'] },
        { code: 'CM-2', label: 'CM', aliases: ['DM-2', 'CAM'] },
        { code: 'RM', label: 'RM', aliases: ['RWB', 'RCM'] },
      ],
    },
    {
      name: 'Attackers',
      slots: [
        { code: 'LW', label: 'LW', aliases: ['LF'] },
        { code: 'ST', label: 'ST', aliases: ['CF'] },
        { code: 'RW', label: 'RW', aliases: ['RF'] },
      ],
    },
  ],
};

/**
 * Check if a player is already assigned to any position in the squad
 */
export function isPlayerInSquad(players: SquadPlayerItem[], playerId: string): boolean {
  return players.some((p) => p.playerId === playerId);
}

/**
 * Find the starter player assigned to a given tactical slot
 */
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

/**
 * Move or swap a starter player to another slot
 */
export function applyMoveStarter(
  players: SquadPlayerItem[],
  sourcePlayerId: string,
  targetSlotCode: string,
): {
  nextPlayers: SquadPlayerItem[];
  swappedPlayer?: SquadPlayerItem;
} {
  const source = players.find((p) => p.playerId === sourcePlayerId);
  if (!source) return { nextPlayers: players };

  const oldSlotCode = source.slotCode;
  const targetOccupant = players.find(
    (p) => p.role === 'STARTER' && p.slotCode === targetSlotCode && p.playerId !== sourcePlayerId,
  );

  const nextPlayers = players.map((p) => {
    if (p.playerId === sourcePlayerId) {
      return { ...p, slotCode: targetSlotCode, role: 'STARTER' as SquadPlayerRole };
    }
    if (targetOccupant && p.playerId === targetOccupant.playerId) {
      return { ...p, slotCode: oldSlotCode };
    }
    return p;
  });

  return {
    nextPlayers,
    swappedPlayer: targetOccupant,
  };
}

/**
 * Move a starter to substitute bench
 */
export function applyStarterToBench(
  players: SquadPlayerItem[],
  playerId: string,
): SquadPlayerItem[] {
  const currentSubCount = players.filter((p) => p.role === 'SUBSTITUTE').length;
  return players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'SUBSTITUTE' as SquadPlayerRole,
        slotCode: null,
        isCaptain: false,
        displayOrder: currentSubCount + 1,
      };
    }
    return p;
  });
}

/**
 * Move a substitute from bench to a starter slot
 */
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

  return {
    nextPlayers,
    displacedStarter,
  };
}
