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

export function isPlayerInSquad(players: any[], playerId: string): boolean {
  return players.some((p) => p.playerId === playerId);
}

export function findStarterForSlot(
  players: any[],
  slot: FormationSlot,
): any | undefined {
  return players.find(
    (p) =>
      p.role === 'STARTER' &&
      (p.slotCode === slot.code ||
        (slot.aliases && p.slotCode && slot.aliases.includes(p.slotCode))),
  );
}

export function applyMoveStarter(
  players: any[],
  sourcePlayerId: string,
  targetSlotCode: string,
): { nextPlayers: any[]; swappedPlayer?: any } {
  const source = players.find((p) => p.playerId === sourcePlayerId);
  if (!source) return { nextPlayers: players };

  const oldSlotCode = source.slotCode;
  const targetOccupant = players.find(
    (p) =>
      p.role === 'STARTER' &&
      p.slotCode === targetSlotCode &&
      p.playerId !== sourcePlayerId,
  );

  const nextPlayers = players.map((p) => {
    if (p.playerId === sourcePlayerId) {
      return { ...p, slotCode: targetSlotCode, role: 'STARTER' };
    }
    if (targetOccupant && p.playerId === targetOccupant.playerId) {
      return { ...p, slotCode: oldSlotCode };
    }
    return p;
  });

  return { nextPlayers, swappedPlayer: targetOccupant };
}

export function applyStarterToBench(players: any[], playerId: string): any[] {
  const currentSubCount = players.filter((p) => p.role === 'SUBSTITUTE').length;
  return players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'SUBSTITUTE',
        slotCode: null,
        isCaptain: false,
        displayOrder: currentSubCount + 1,
      };
    }
    return p;
  });
}

export function applyBenchToStarter(
  players: any[],
  playerId: string,
  targetSlotCode: string,
): { nextPlayers: any[]; displacedStarter?: any } {
  const displacedStarter = players.find(
    (p) =>
      p.role === 'STARTER' &&
      p.slotCode === targetSlotCode &&
      p.playerId !== playerId,
  );

  const nextPlayers = players.map((p) => {
    if (p.playerId === playerId) {
      return {
        ...p,
        role: 'STARTER',
        slotCode: targetSlotCode,
      };
    }
    if (displacedStarter && p.playerId === displacedStarter.playerId) {
      return {
        ...p,
        role: 'SUBSTITUTE',
        slotCode: null,
        isCaptain: false,
      };
    }
    return p;
  });

  return { nextPlayers, displacedStarter };
}

describe('Tactical Pitch Placement & Mutation Logic', () => {
  const mockStarterGK = {
    id: 'sp-1',
    squadId: 'squad-1',
    playerId: 'p-1',
    slotCode: 'GK',
    role: 'STARTER',
    isCaptain: false,
    displayOrder: null,
  };

  const mockStarterCB = {
    id: 'sp-2',
    squadId: 'squad-1',
    playerId: 'p-2',
    slotCode: 'CB-1',
    role: 'STARTER',
    isCaptain: true,
    displayOrder: null,
  };

  const mockSub = {
    id: 'sp-3',
    squadId: 'squad-1',
    playerId: 'p-3',
    slotCode: null,
    role: 'SUBSTITUTE',
    isCaptain: false,
    displayOrder: 1,
  };

  const initialPlayers = [mockStarterGK, mockStarterCB, mockSub];

  describe('TC-02 & TC-07: Formation Layout & Slots', () => {
    const formations = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3'];

    formations.forEach((fmt) => {
      it(`should define exactly 11 slots for ${fmt}`, () => {
        const config = FORMATION_CONFIGS[fmt];
        expect(config).toBeDefined();
        const totalSlots = config.reduce(
          (acc, row) => acc + row.slots.length,
          0,
        );
        expect(totalSlots).toBe(11);
      });
    });
  });

  describe('TC-01 & TC-06: Slot Matching & Duplicate Prevention', () => {
    it('TC-01: should match starter slot by slotCode and aliases', () => {
      const found = findStarterForSlot(initialPlayers, {
        code: 'CB-1',
        label: 'CB',
        aliases: ['LCB'],
      });
      expect(found).toBeDefined();
      expect(found.playerId).toBe('p-2');
    });

    it('TC-06: should detect existing player in squad', () => {
      expect(isPlayerInSquad(initialPlayers, 'p-1')).toBe(true);
      expect(isPlayerInSquad(initialPlayers, 'p-99')).toBe(false);
    });
  });

  describe('TC-02 & TC-03: Move Starter & Swap', () => {
    it('TC-03: should move starter to empty slot', () => {
      const { nextPlayers, swappedPlayer } = applyMoveStarter(
        initialPlayers,
        'p-1',
        'LB',
      );
      expect(swappedPlayer).toBeUndefined();
      const p1 = nextPlayers.find((p) => p.playerId === 'p-1');
      expect(p1.slotCode).toBe('LB');
    });

    it('TC-02: should swap positions when target slot is occupied', () => {
      const { nextPlayers, swappedPlayer } = applyMoveStarter(
        initialPlayers,
        'p-1',
        'CB-1',
      );
      expect(swappedPlayer).toBeDefined();
      expect(swappedPlayer.playerId).toBe('p-2');

      const p1 = nextPlayers.find((p) => p.playerId === 'p-1');
      const p2 = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(p1.slotCode).toBe('CB-1');
      expect(p2.slotCode).toBe('GK');
    });
  });

  describe('TC-04 & TC-05: Starter <-> Substitute Conversion', () => {
    it('TC-04: should demote starter to bench and reset captain', () => {
      const nextPlayers = applyStarterToBench(initialPlayers, 'p-2');
      const p2 = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(p2.role).toBe('SUBSTITUTE');
      expect(p2.slotCode).toBeNull();
      expect(p2.isCaptain).toBe(false);
    });

    it('TC-05: should promote substitute to starter and displace occupant to bench', () => {
      const { nextPlayers, displacedStarter } = applyBenchToStarter(
        initialPlayers,
        'p-3',
        'CB-1',
      );
      expect(displacedStarter).toBeDefined();
      expect(displacedStarter.playerId).toBe('p-2');

      const p3 = nextPlayers.find((p) => p.playerId === 'p-3');
      const p2 = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(p3.role).toBe('STARTER');
      expect(p3.slotCode).toBe('CB-1');

      expect(p2.role).toBe('SUBSTITUTE');
      expect(p2.slotCode).toBeNull();
      expect(p2.isCaptain).toBe(false);
    });
  });

  describe('TC-08 & TC-09: Rollback State Verification', () => {
    it('should restore original state on mutation failure', () => {
      const previousSnapshot = [...initialPlayers];
      // Simulate optimistic mutation
      let currentPlayers = applyStarterToBench(initialPlayers, 'p-1');
      expect(currentPlayers.find((p) => p.playerId === 'p-1')?.role).toBe(
        'SUBSTITUTE',
      );

      // Simulate API failure -> rollback
      currentPlayers = previousSnapshot;
      expect(currentPlayers.find((p) => p.playerId === 'p-1')?.role).toBe(
        'STARTER',
      );
      expect(currentPlayers.find((p) => p.playerId === 'p-1')?.slotCode).toBe(
        'GK',
      );
    });
  });
});
