import { FootballDataPlayerPositionMapper } from './football-data-player-position.mapper';

describe('FootballDataPlayerPositionMapper', () => {
  const testPlayerExtId = '44';

  describe('mapPosition', () => {
    it('TC-01: should map Goalkeeper to GK', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Goalkeeper')).toBe('GK');
      expect(FootballDataPlayerPositionMapper.mapPosition('GK')).toBe('GK');
    });

    it('TC-02: should map Centre-Back to CB', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Centre-Back')).toBe('CB');
      expect(FootballDataPlayerPositionMapper.mapPosition('Center-Back')).toBe('CB');
      expect(FootballDataPlayerPositionMapper.mapPosition('CB')).toBe('CB');
    });

    it('TC-03: should map Centre-Forward to ST', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Centre-Forward')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('Center-Forward')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('Striker')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('ST')).toBe('ST');
    });

    it('TC-04: should map Left Winger to LW', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Left Winger')).toBe('LW');
      expect(FootballDataPlayerPositionMapper.mapPosition('Left Wing')).toBe('LW');
      expect(FootballDataPlayerPositionMapper.mapPosition('LW')).toBe('LW');
    });

    it('TC-05: should map Right Winger to RW', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Right Winger')).toBe('RW');
      expect(FootballDataPlayerPositionMapper.mapPosition('Right Wing')).toBe('RW');
      expect(FootballDataPlayerPositionMapper.mapPosition('RW')).toBe('RW');
    });

    it('TC-06: should map ambiguous general positions to core anchors without fabricating multiple positions', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Midfield')).toBe('CM');
      expect(FootballDataPlayerPositionMapper.mapPosition('Midfielder')).toBe('CM');
      expect(FootballDataPlayerPositionMapper.mapPosition('Defence')).toBe('CB');
      expect(FootballDataPlayerPositionMapper.mapPosition('Defender')).toBe('CB');
      expect(FootballDataPlayerPositionMapper.mapPosition('Attack')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('Offence')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('Forward')).toBe('ST');
    });

    it('TC-07: should safely handle null and undefined', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition(null)).toBeNull();
      expect(FootballDataPlayerPositionMapper.mapPosition(undefined)).toBeNull();
    });

    it('TC-08: should safely handle empty string', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('')).toBeNull();
      expect(FootballDataPlayerPositionMapper.mapPosition('   ')).toBeNull();
    });

    it('TC-09: should safely handle unknown and unexpected values', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('Unknown')).toBeNull();
      expect(FootballDataPlayerPositionMapper.mapPosition('Coach')).toBeNull();
      expect(FootballDataPlayerPositionMapper.mapPosition('Referee')).toBeNull();
      expect(FootballDataPlayerPositionMapper.mapPosition('xyz123')).toBeNull();
    });

    it('TC-10: should trim surrounding whitespace', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('  Centre-Forward  ')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('   Goalkeeper ')).toBe('GK');
    });

    it('TC-11: should handle various casing', () => {
      expect(FootballDataPlayerPositionMapper.mapPosition('CENTRE-FORWARD')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('centre-forward')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('cEnTrE-fOrWaRd')).toBe('ST');
      expect(FootballDataPlayerPositionMapper.mapPosition('GOALKEEPER')).toBe('GK');
    });

    it('TC-12: should be deterministic and idempotent', () => {
      const input = 'Attacking Midfield';
      const output1 = FootballDataPlayerPositionMapper.mapPosition(input);
      const output2 = FootballDataPlayerPositionMapper.mapPosition(input);
      const output3 = FootballDataPlayerPositionMapper.mapPosition(input);

      expect(output1).toBe('CAM');
      expect(output2).toBe('CAM');
      expect(output3).toBe('CAM');
    });
  });

  describe('toTransformedPosition & toTransformedPositionList', () => {
    it('TC-13 & TC-14: should execute purely without DB or HTTP requirements', () => {
      const result = FootballDataPlayerPositionMapper.toTransformedPosition(
        testPlayerExtId,
        'Centre-Forward',
      );

      expect(result).toEqual({
        playerExternalId: '44',
        externalProvider: 'FOOTBALL_DATA_ORG',
        positionCode: 'ST',
        isPrimary: true,
      });
    });

    it('TC-15: should never fabricate secondary positions when single position is provided', () => {
      const list = FootballDataPlayerPositionMapper.toTransformedPositionList(
        testPlayerExtId,
        'Midfield',
      );

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        playerExternalId: '44',
        externalProvider: 'FOOTBALL_DATA_ORG',
        positionCode: 'CM',
        isPrimary: true,
      });
    });

    it('should return empty list for invalid input in toTransformedPositionList', () => {
      expect(
        FootballDataPlayerPositionMapper.toTransformedPositionList(testPlayerExtId, null),
      ).toEqual([]);
      expect(
        FootballDataPlayerPositionMapper.toTransformedPositionList(testPlayerExtId, ''),
      ).toEqual([]);
      expect(
        FootballDataPlayerPositionMapper.toTransformedPositionList(testPlayerExtId, 'Unknown'),
      ).toEqual([]);
      expect(
        FootballDataPlayerPositionMapper.toTransformedPositionList('', 'Centre-Forward'),
      ).toEqual([]);
      expect(
        FootballDataPlayerPositionMapper.toTransformedPositionList(null as any, 'Centre-Forward'),
      ).toEqual([]);
    });

    it('should support custom provider argument', () => {
      const result = FootballDataPlayerPositionMapper.toTransformedPosition(
        testPlayerExtId,
        'Left-Back',
        'CUSTOM_PROVIDER',
      );

      expect(result).toEqual({
        playerExternalId: '44',
        externalProvider: 'CUSTOM_PROVIDER',
        positionCode: 'LB',
        isPrimary: true,
      });
    });
  });
});
