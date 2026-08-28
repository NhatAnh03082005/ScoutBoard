import {
  FORMATION_CONFIGS,
  findStarterForSlot,
  isPlayerInSquad,
  applyMoveStarter,
  applyStarterToBench,
  applyBenchToStarter,
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

  describe('Formation Layout Validation', () => {
    const formations = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3'];

    formations.forEach((fmt) => {
      it(`should have exactly 11 slots for formation ${fmt}`, () => {
        const config = FORMATION_CONFIGS[fmt];
        expect(config).toBeDefined();
        const totalSlots = config.reduce((acc, row) => acc + row.slots.length, 0);
        expect(totalSlots).toBe(11);
      });
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
