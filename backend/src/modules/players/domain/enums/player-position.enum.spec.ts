import {
  CANONICAL_PLAYER_POSITIONS,
  getPositionGroup,
  isCanonicalPlayerPosition,
  normalizeToCanonicalPosition,
} from './player-position.enum';

describe('PlayerPositionEnum & Normalizer', () => {
  describe('CANONICAL_PLAYER_POSITIONS Contract', () => {
    it('should contain exactly 18 canonical position codes (15 specific + 3 broad categories)', () => {
      expect(CANONICAL_PLAYER_POSITIONS).toHaveLength(18);
      // 15 specific roles
      const specificRoles = [
        'GK',
        'LB',
        'CB',
        'RB',
        'LWB',
        'RWB',
        'CDM',
        'CM',
        'CAM',
        'LM',
        'RM',
        'LW',
        'RW',
        'CF',
        'ST',
      ];
      for (const role of specificRoles) {
        expect(CANONICAL_PLAYER_POSITIONS).toContain(role);
      }
      // 3 broad category fallbacks
      expect(CANONICAL_PLAYER_POSITIONS).toContain('DEF');
      expect(CANONICAL_PLAYER_POSITIONS).toContain('MID');
      expect(CANONICAL_PLAYER_POSITIONS).toContain('FWD');
    });

    it('should validate canonical positions accurately via isCanonicalPlayerPosition', () => {
      expect(isCanonicalPlayerPosition('LB')).toBe(true);
      expect(isCanonicalPlayerPosition('RB')).toBe(true);
      expect(isCanonicalPlayerPosition('DEF')).toBe(true);
      expect(isCanonicalPlayerPosition('INVALID_POS')).toBe(false);
      expect(isCanonicalPlayerPosition(null)).toBe(false);
      expect(isCanonicalPlayerPosition(undefined)).toBe(false);
    });
  });

  describe('LB/RB Position Classification & Regression Protection', () => {
    it('should NOT convert valid LB classifications to generic DEF', () => {
      expect(normalizeToCanonicalPosition('LB')).toBe('LB');
      expect(normalizeToCanonicalPosition('Left-Back')).toBe('LB');
      expect(normalizeToCanonicalPosition('LEFT BACK')).toBe('LB');
      expect(normalizeToCanonicalPosition('Left Defender')).toBe('LB');
      expect(normalizeToCanonicalPosition('left_back')).toBe('LB');
    });

    it('should NOT convert valid RB classifications to generic DEF', () => {
      expect(normalizeToCanonicalPosition('RB')).toBe('RB');
      expect(normalizeToCanonicalPosition('Right-Back')).toBe('RB');
      expect(normalizeToCanonicalPosition('RIGHT BACK')).toBe('RB');
      expect(normalizeToCanonicalPosition('Right Defender')).toBe('RB');
      expect(normalizeToCanonicalPosition('right_back')).toBe('RB');
    });

    it('should preserve wing backs (LWB / RWB)', () => {
      expect(normalizeToCanonicalPosition('LWB')).toBe('LWB');
      expect(normalizeToCanonicalPosition('Left Wing-Back')).toBe('LWB');
      expect(normalizeToCanonicalPosition('RWB')).toBe('RWB');
      expect(normalizeToCanonicalPosition('Right Wing-Back')).toBe('RWB');
    });

    it('should preserve broad category DEF when API-Football only provides generic DEF with no grid/side evidence', () => {
      // When API-Football only provides "Defender" or "DEF" without lineup grid/side
      expect(normalizeToCanonicalPosition('Defender')).toBe('DEF');
      expect(normalizeToCanonicalPosition('DEF')).toBe('DEF');
      expect(normalizeToCanonicalPosition('DEFENCE')).toBe('DEF');
      expect(normalizeToCanonicalPosition('D')).toBe('DEF');
      // Must NOT arbitrarily force to CB, LB, or RB
      expect(normalizeToCanonicalPosition('Defender')).not.toBe('CB');
      expect(normalizeToCanonicalPosition('Defender')).not.toBe('LB');
      expect(normalizeToCanonicalPosition('Defender')).not.toBe('RB');
    });

    it('should correctly infer LB / RB from generic Defender when tactical lineup grid is present', () => {
      // Grid row 2 (defense): col 1 = LB, col 2/3 = CB, col 4/5 = RB
      expect(normalizeToCanonicalPosition('Defender', { grid: '2:1' })).toBe(
        'LB',
      );
      expect(normalizeToCanonicalPosition('Defender', { grid: '2:2' })).toBe(
        'CB',
      );
      expect(normalizeToCanonicalPosition('Defender', { grid: '2:3' })).toBe(
        'CB',
      );
      expect(normalizeToCanonicalPosition('Defender', { grid: '2:4' })).toBe(
        'RB',
      );
      expect(normalizeToCanonicalPosition('Defender', { grid: '2:5' })).toBe(
        'RB',
      );
    });

    it('should infer LB / RB when side context is provided with generic Defender', () => {
      expect(normalizeToCanonicalPosition('Defender', { side: 'LEFT' })).toBe(
        'LB',
      );
      expect(normalizeToCanonicalPosition('Defender', { side: 'RIGHT' })).toBe(
        'RB',
      );
    });
  });

  describe('Position Groups mapping', () => {
    it('should map LB, RB, CB, and DEF to DEFENDER group', () => {
      expect(getPositionGroup('LB')).toBe('DEFENDER');
      expect(getPositionGroup('RB')).toBe('DEFENDER');
      expect(getPositionGroup('CB')).toBe('DEFENDER');
      expect(getPositionGroup('LWB')).toBe('DEFENDER');
      expect(getPositionGroup('RWB')).toBe('DEFENDER');
      expect(getPositionGroup('DEF')).toBe('DEFENDER');
    });

    it('should map midfield positions and MID to MIDFIELDER group', () => {
      expect(getPositionGroup('CDM')).toBe('MIDFIELDER');
      expect(getPositionGroup('CM')).toBe('MIDFIELDER');
      expect(getPositionGroup('CAM')).toBe('MIDFIELDER');
      expect(getPositionGroup('LM')).toBe('MIDFIELDER');
      expect(getPositionGroup('RM')).toBe('MIDFIELDER');
      expect(getPositionGroup('MID')).toBe('MIDFIELDER');
    });

    it('should map forward positions and FWD to FORWARD group', () => {
      expect(getPositionGroup('ST')).toBe('FORWARD');
      expect(getPositionGroup('CF')).toBe('FORWARD');
      expect(getPositionGroup('LW')).toBe('FORWARD');
      expect(getPositionGroup('RW')).toBe('FORWARD');
      expect(getPositionGroup('FWD')).toBe('FORWARD');
    });

    it('should map GK to GOALKEEPER group', () => {
      expect(getPositionGroup('GK')).toBe('GOALKEEPER');
    });
  });
});
