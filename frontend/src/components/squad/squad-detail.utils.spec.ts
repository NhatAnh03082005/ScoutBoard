import { describe, it, expect } from 'vitest';
import {
  getSlotCategory,
  getCleanDisplayPosition,
  getPillBadgeColor,
} from './squad-detail.utils';
import { CANONICAL_PLAYER_POSITIONS, type PlayerPosition } from '../../types/player.types';

describe('Squad Detail Utilities (squad-detail.utils)', () => {
  // =========================================================================
  // 1. getSlotCategory — Canonical Positions
  // =========================================================================
  describe('getSlotCategory (15 Canonical Positions)', () => {
    const canonicalCategoryMap: Record<
      PlayerPosition,
      'attacker' | 'midfielder' | 'defender' | 'goalkeeper'
    > = {
      GK: 'goalkeeper',
      CB: 'defender',
      LB: 'defender',
      RB: 'defender',
      LWB: 'defender',
      RWB: 'defender',
      CM: 'midfielder',
      CDM: 'midfielder',
      CAM: 'midfielder',
      LM: 'midfielder',
      RM: 'midfielder',
      LW: 'attacker',
      RW: 'attacker',
      CF: 'attacker',
      ST: 'attacker',
    };

    CANONICAL_PLAYER_POSITIONS.forEach((pos) => {
      it(`categorizes canonical position ${pos} as '${canonicalCategoryMap[pos]}'`, () => {
        expect(getSlotCategory(pos)).toBe(canonicalCategoryMap[pos]);
        expect(getSlotCategory(pos.toLowerCase())).toBe(canonicalCategoryMap[pos]);
      });
    });

    it('defaults to midfielder for empty, null, or undefined', () => {
      expect(getSlotCategory(null)).toBe('midfielder');
      expect(getSlotCategory(undefined)).toBe('midfielder');
      expect(getSlotCategory('')).toBe('midfielder');
    });
  });

  // =========================================================================
  // 2. getSlotCategory — Explicit Legacy Aliases Supported in Production
  // =========================================================================
  describe('getSlotCategory (Production-Supported Aliases)', () => {
    it('categorizes production-supported aliases SS and FWD as attacker', () => {
      expect(getSlotCategory('SS')).toBe('attacker');
      expect(getSlotCategory('FWD')).toBe('attacker');
    });

    it('categorizes production-supported alias DEF as defender', () => {
      expect(getSlotCategory('DEF')).toBe('defender');
    });
  });

  // =========================================================================
  // 3. getCleanDisplayPosition
  // =========================================================================
  describe('getCleanDisplayPosition', () => {
    it('normalizes tactical slot variant codes into clean canonical display names', () => {
      expect(getCleanDisplayPosition('LS')).toBe('ST');
      expect(getCleanDisplayPosition('RS')).toBe('ST');
      expect(getCleanDisplayPosition('CF')).toBe('ST');
      expect(getCleanDisplayPosition('SS')).toBe('ST');

      expect(getCleanDisplayPosition('LCB')).toBe('CB');
      expect(getCleanDisplayPosition('RCB')).toBe('CB');

      expect(getCleanDisplayPosition('LDM')).toBe('CDM');
      expect(getCleanDisplayPosition('RDM')).toBe('CDM');

      expect(getCleanDisplayPosition('LCM')).toBe('CM');
      expect(getCleanDisplayPosition('RCM')).toBe('CM');

      expect(getCleanDisplayPosition('LAM')).toBe('CAM');
      expect(getCleanDisplayPosition('RAM')).toBe('CAM');
    });

    it('preserves other canonical position codes unchanged', () => {
      expect(getCleanDisplayPosition('GK')).toBe('GK');
      expect(getCleanDisplayPosition('LB')).toBe('LB');
      expect(getCleanDisplayPosition('RB')).toBe('RB');
      expect(getCleanDisplayPosition('LWB')).toBe('LWB');
      expect(getCleanDisplayPosition('RWB')).toBe('RWB');
      expect(getCleanDisplayPosition('LM')).toBe('LM');
      expect(getCleanDisplayPosition('RM')).toBe('RM');
      expect(getCleanDisplayPosition('LW')).toBe('LW');
      expect(getCleanDisplayPosition('RW')).toBe('RW');
    });

    it('returns POS when posCode is empty, null, or undefined', () => {
      expect(getCleanDisplayPosition(null)).toBe('POS');
      expect(getCleanDisplayPosition(undefined)).toBe('POS');
      expect(getCleanDisplayPosition('')).toBe('POS');
    });
  });

  // =========================================================================
  // 4. getPillBadgeColor
  // =========================================================================
  describe('getPillBadgeColor', () => {
    it('returns red #e11d48 for attackers', () => {
      expect(getPillBadgeColor('ST')).toBe('#e11d48');
      expect(getPillBadgeColor('LW')).toBe('#e11d48');
      expect(getPillBadgeColor('RW')).toBe('#e11d48');
      expect(getPillBadgeColor('CF')).toBe('#e11d48');
    });

    it('returns green #10b981 for midfielders', () => {
      expect(getPillBadgeColor('CM')).toBe('#10b981');
      expect(getPillBadgeColor('CDM')).toBe('#10b981');
      expect(getPillBadgeColor('CAM')).toBe('#10b981');
      expect(getPillBadgeColor('LM')).toBe('#10b981');
      expect(getPillBadgeColor('RM')).toBe('#10b981');
    });

    it('returns blue #2563eb for defenders', () => {
      expect(getPillBadgeColor('CB')).toBe('#2563eb');
      expect(getPillBadgeColor('LB')).toBe('#2563eb');
      expect(getPillBadgeColor('RB')).toBe('#2563eb');
      expect(getPillBadgeColor('LWB')).toBe('#2563eb');
      expect(getPillBadgeColor('RWB')).toBe('#2563eb');
    });

    it('returns amber #f59e0b for goalkeepers', () => {
      expect(getPillBadgeColor('GK')).toBe('#f59e0b');
    });
  });
});
