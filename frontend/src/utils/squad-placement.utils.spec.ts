import {
  FORMATION_CONFIGS,
  findStarterForSlot,
  isPlayerInSquad,
  applyMoveStarter,
  applyStarterToBench,
  applyBenchToStarter,
  isPlayerEligibleForSlot,
} from './squad-placement.utils';
import type { SquadPlayerItem } from '../types/squad.types';

describe('Squad Placement Utilities', () => {
  const mockStarterGK: SquadPlayerItem = {
    id: 'sp-1',
    squadId: 'squad-1',
    playerId: 'p-1',
    slotCode: 'GK',
    role: 'STARTER',
    isCaptain: false,
    displayOrder: null,
    player: { id: 'p-1', name: 'Alisson', shortName: 'Alisson' } as any,
  };

  const mockStarterCB: SquadPlayerItem = {
    id: 'sp-2',
    squadId: 'squad-1',
    playerId: 'p-2',
    slotCode: 'CB-1',
    role: 'STARTER',
    isCaptain: true,
    displayOrder: null,
    player: { id: 'p-2', name: 'Virgil van Dijk', shortName: 'Van Dijk' } as any,
  };

  const mockSub: SquadPlayerItem = {
    id: 'sp-3',
    squadId: 'squad-1',
    playerId: 'p-3',
    slotCode: null,
    role: 'SUBSTITUTE',
    isCaptain: false,
    displayOrder: 1,
    player: { id: 'p-3', name: 'Darwin Nunez', shortName: 'Nunez' } as any,
  };

  const initialPlayers: SquadPlayerItem[] = [mockStarterGK, mockStarterCB, mockSub];

  describe('Formation Layout & Pitch Orientation Validation', () => {
    const formations = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3'];

    formations.forEach((fmt) => {
      it(`should have exactly 11 slots for formation ${fmt}`, () => {
        const config = FORMATION_CONFIGS[fmt];
        expect(config).toBeDefined();
        const totalSlots = config.reduce((acc, row) => acc + row.slots.length, 0);
        expect(totalSlots).toBe(11);
      });

      it(`should have Attackers at row 0 (top) and Goalkeeper at the bottom row for ${fmt}`, () => {
        const config = FORMATION_CONFIGS[fmt];
        const topRow = config[0];
        const bottomRow = config[config.length - 1];

        expect(topRow.name).toBe('Attackers');
        expect(bottomRow.name).toBe('Goalkeeper');
        expect(bottomRow.slots[0].requiredPosition).toBe('GK');
      });
    });

    it('should assign canonical requiredPosition to all slots', () => {
      Object.entries(FORMATION_CONFIGS).forEach(([_code, rows]) => {
        rows.forEach((row) => {
          row.slots.forEach((slot) => {
            expect(slot.requiredPosition).toBeDefined();
            expect(typeof slot.requiredPosition).toBe('string');
            expect(slot.requiredPosition.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('isPlayerEligibleForSlot (Test Matrix)', () => {
    // Example 1: Player Primary = CM, Secondary = CDM
    const playerCmCdm = {
      primaryPosition: 'CM',
      positions: [
        { positionCode: 'CM', isPrimary: true },
        { positionCode: 'CDM', isPrimary: false },
      ],
    };

    it('Example 1: CM / CDM player is eligible for CM and CDM, but rejected for CAM and CB', () => {
      expect(isPlayerEligibleForSlot(playerCmCdm, 'CM')).toBe(true);
      expect(isPlayerEligibleForSlot(playerCmCdm, 'CDM')).toBe(true);
      expect(isPlayerEligibleForSlot(playerCmCdm, 'CAM')).toBe(false);
      expect(isPlayerEligibleForSlot(playerCmCdm, 'CB')).toBe(false);
    });

    // Example 2: Player Primary = LW, Secondary = ST
    const playerLwSt = {
      primaryPosition: 'LW',
      positions: [
        { positionCode: 'LW', isPrimary: true },
        { positionCode: 'ST', isPrimary: false },
      ],
    };

    it('Example 2: LW / ST player is eligible for LW and ST, but rejected for RW and CAM', () => {
      expect(isPlayerEligibleForSlot(playerLwSt, 'LW')).toBe(true);
      expect(isPlayerEligibleForSlot(playerLwSt, 'ST')).toBe(true);
      expect(isPlayerEligibleForSlot(playerLwSt, 'RW')).toBe(false);
      expect(isPlayerEligibleForSlot(playerLwSt, 'CAM')).toBe(false);
    });

    // Example 3: Player Primary = CB, Secondary = LB
    const playerCbLb = {
      primaryPosition: 'CB',
      positions: [
        { positionCode: 'CB', isPrimary: true },
        { positionCode: 'LB', isPrimary: false },
      ],
    };

    it('Example 3: CB / LB player is eligible for CB and LB, but rejected for RB and CDM', () => {
      expect(isPlayerEligibleForSlot(playerCbLb, 'CB')).toBe(true);
      expect(isPlayerEligibleForSlot(playerCbLb, 'LB')).toBe(true);
      expect(isPlayerEligibleForSlot(playerCbLb, 'RB')).toBe(false);
      expect(isPlayerEligibleForSlot(playerCbLb, 'CDM')).toBe(false);
    });

    // Example 4: Player Primary = GK
    const playerGk = {
      primaryPosition: 'GK',
      positions: [{ positionCode: 'GK', isPrimary: true }],
    };

    it('Example 4: GK player is only eligible for GK, rejected for CB and ST', () => {
      expect(isPlayerEligibleForSlot(playerGk, 'GK')).toBe(true);
      expect(isPlayerEligibleForSlot(playerGk, 'CB')).toBe(false);
      expect(isPlayerEligibleForSlot(playerGk, 'ST')).toBe(false);
    });

    it('Edge cases: handles case-insensitivity, whitespace, null/undefined player or requiredPosition', () => {
      expect(isPlayerEligibleForSlot(playerCmCdm, ' cm ')).toBe(true);
      expect(isPlayerEligibleForSlot(playerCmCdm, 'cdm')).toBe(true);
      expect(isPlayerEligibleForSlot(null, 'CM')).toBe(false);
      expect(isPlayerEligibleForSlot(undefined, 'CM')).toBe(false);
      expect(isPlayerEligibleForSlot(playerCmCdm, '')).toBe(false);
    });
  });

  describe('findStarterForSlot & isPlayerInSquad', () => {
    it('TC-01: should find starter by slot code or alias', () => {
      const found = findStarterForSlot(initialPlayers, { code: 'CB-1', label: 'CB', aliases: ['LCB'] });
      expect(found).toBeDefined();
      expect(found?.playerId).toBe('p-2');
    });

    it('TC-06: should return true when player is already in squad', () => {
      expect(isPlayerInSquad(initialPlayers, 'p-1')).toBe(true);
      expect(isPlayerInSquad(initialPlayers, 'p-99')).toBe(false);
    });
  });

  describe('applyMoveStarter (Move & Swap)', () => {
    it('TC-03: should move starter to an empty slot', () => {
      const { nextPlayers, swappedPlayer } = applyMoveStarter(initialPlayers, 'p-1', 'LB');
      expect(swappedPlayer).toBeUndefined();
      const moved = nextPlayers.find((p) => p.playerId === 'p-1');
      expect(moved?.slotCode).toBe('LB');
    });

    it('TC-02: should swap positions when dragging onto an occupied slot', () => {
      const { nextPlayers, swappedPlayer } = applyMoveStarter(initialPlayers, 'p-1', 'CB-1');
      expect(swappedPlayer).toBeDefined();
      expect(swappedPlayer?.playerId).toBe('p-2');

      const player1 = nextPlayers.find((p) => p.playerId === 'p-1');
      const player2 = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(player1?.slotCode).toBe('CB-1');
      expect(player2?.slotCode).toBe('GK');
    });
  });

  describe('applyStarterToBench & applyBenchToStarter', () => {
    it('TC-04: should demote starter to bench and reset captain status', () => {
      const nextPlayers = applyStarterToBench(initialPlayers, 'p-2');
      const demoted = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(demoted?.role).toBe('SUBSTITUTE');
      expect(demoted?.slotCode).toBeNull();
      expect(demoted?.isCaptain).toBe(false);
    });

    it('TC-05: should promote substitute to starter slot and displace existing starter', () => {
      const { nextPlayers, displacedStarter } = applyBenchToStarter(initialPlayers, 'p-3', 'CB-1');
      expect(displacedStarter).toBeDefined();
      expect(displacedStarter?.playerId).toBe('p-2');

      const promoted = nextPlayers.find((p) => p.playerId === 'p-3');
      const displaced = nextPlayers.find((p) => p.playerId === 'p-2');

      expect(promoted?.role).toBe('STARTER');
      expect(promoted?.slotCode).toBe('CB-1');

      expect(displaced?.role).toBe('SUBSTITUTE');
      expect(displaced?.slotCode).toBeNull();
      expect(displaced?.isCaptain).toBe(false);
    });
  });
});
