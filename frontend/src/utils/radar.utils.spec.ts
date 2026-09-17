import { describe, it, expect } from 'vitest';
import {
  normalizeMetric,
  getRadarProfile,
  getRadarProfileTitle,
  getRadarMetrics,
  calculateRadarScores,
  RADAR_CONFIGS,
  type TacticalRadarProfile,
} from './radar.utils';
import { CANONICAL_PLAYER_POSITIONS, type PlayerPosition } from '../types/player.types';

describe('Radar Utilities (radar.utils)', () => {
  // =========================================================================
  // 1. normalizeMetric
  // =========================================================================
  describe('normalizeMetric', () => {
    it('normalizes valid values linearly between min and max into 0–100', () => {
      expect(normalizeMetric(50, 0, 100)).toBe(50);
      expect(normalizeMetric(25, 0, 100)).toBe(25);
      expect(normalizeMetric(75, 0, 100)).toBe(75);
      expect(normalizeMetric(5, 0, 10)).toBe(50);
      expect(normalizeMetric(80, 60, 100)).toBe(50);
    });

    it('clamps values below min to 0 and above max to 100', () => {
      expect(normalizeMetric(-10, 0, 100)).toBe(0);
      expect(normalizeMetric(150, 0, 100)).toBe(100);
      expect(normalizeMetric(5, 10, 50)).toBe(0);
      expect(normalizeMetric(60, 10, 50)).toBe(100);
    });

    it('returns 0 for zero or negative values when inverse is false', () => {
      expect(normalizeMetric(0, 0, 100)).toBe(0);
      expect(normalizeMetric(-5, 0, 50)).toBe(0);
    });

    it('handles null, undefined, and NaN by returning 0', () => {
      expect(normalizeMetric(null, 0, 100)).toBe(0);
      expect(normalizeMetric(undefined, 0, 100)).toBe(0);
      expect(normalizeMetric(NaN, 0, 100)).toBe(0);
    });

    it('supports inverse metrics (lower value produces higher score)', () => {
      // E.g., goals conceded per 90 (min: 0.6, max: 2.4, inverse: true)
      // Value at min (0.6) is the best => score 100
      expect(normalizeMetric(0.6, 0.6, 2.4, true)).toBe(100);
      // Value at max (2.4) is the worst => score 0
      expect(normalizeMetric(2.4, 0.6, 2.4, true)).toBe(0);
      // Value at midpoint (1.5) => score 50
      expect(normalizeMetric(1.5, 0.6, 2.4, true)).toBe(50);
      // Value below min clamps to best (100)
      expect(normalizeMetric(0.3, 0.6, 2.4, true)).toBe(100);
      // Value above max clamps to worst (0)
      expect(normalizeMetric(3.0, 0.6, 2.4, true)).toBe(0);
    });
  });

  // =========================================================================
  // 2. getRadarProfile — Canonical Positions (Primary Matrix)
  // =========================================================================
  describe('getRadarProfile (15 Canonical Positions)', () => {
    const canonicalProfileMap: Record<PlayerPosition, TacticalRadarProfile> = {
      GK: 'GK',
      CB: 'CB',
      LB: 'FULLBACK',
      RB: 'FULLBACK',
      LWB: 'FULLBACK',
      RWB: 'FULLBACK',
      CDM: 'CDM',
      CM: 'CM',
      CAM: 'CAM',
      LM: 'WIDE',
      RM: 'WIDE',
      LW: 'ATT',
      RW: 'ATT',
      CF: 'ATT',
      ST: 'ATT',
    };

    CANONICAL_PLAYER_POSITIONS.forEach((pos) => {
      it(`maps canonical position ${pos} -> ${canonicalProfileMap[pos]}`, () => {
        expect(getRadarProfile(pos)).toBe(canonicalProfileMap[pos]);
        expect(getRadarProfile(pos.toLowerCase())).toBe(canonicalProfileMap[pos]);
        expect(getRadarProfile(` ${pos} `)).toBe(canonicalProfileMap[pos]);
      });
    });

    it('defaults to CM for empty, null, undefined, or unrecognized input', () => {
      expect(getRadarProfile(null)).toBe('CM');
      expect(getRadarProfile(undefined)).toBe('CM');
      expect(getRadarProfile('')).toBe('CM');
      expect(getRadarProfile('UNKNOWN_POS')).toBe('CM');
    });
  });

  // =========================================================================
  // 3. getRadarProfile — Legacy / Input Aliases (Secondary Test Block)
  // =========================================================================
  describe('getRadarProfile (Legacy Input Aliases)', () => {
    it('normalizes supported legacy aliases into valid tactical profiles', () => {
      expect(getRadarProfile('DEF')).toBe('FULLBACK');
      expect(getRadarProfile('DM')).toBe('CDM');
      expect(getRadarProfile('AM')).toBe('CAM');
      expect(getRadarProfile('FWD')).toBe('ATT');
      expect(getRadarProfile('ATT')).toBe('ATT');
      expect(getRadarProfile('FORWARD')).toBe('ATT');
    });
  });

  // =========================================================================
  // 4. getRadarProfileTitle
  // =========================================================================
  describe('getRadarProfileTitle', () => {
    const titles: Record<TacticalRadarProfile, string> = {
      GK: 'GOALKEEPER',
      CB: 'CENTRE BACK',
      FULLBACK: 'FULLBACK / WING BACK',
      CDM: 'DEFENSIVE MIDFIELDER',
      CM: 'CENTRAL MIDFIELDER',
      CAM: 'ATTACKING MIDFIELDER',
      WIDE: 'WIDE MIDFIELDER',
      ATT: 'ATTACKER',
    };

    (Object.keys(titles) as TacticalRadarProfile[]).forEach((profile) => {
      it(`returns correct title for profile ${profile}`, () => {
        expect(getRadarProfileTitle(profile)).toBe(titles[profile]);
      });
    });
  });

  // =========================================================================
  // 5. RADAR_CONFIGS & Axis Definitions
  // =========================================================================
  describe('RADAR_CONFIGS Structure', () => {
    const allProfiles: TacticalRadarProfile[] = [
      'GK',
      'CB',
      'FULLBACK',
      'CDM',
      'CM',
      'CAM',
      'WIDE',
      'ATT',
    ];

    allProfiles.forEach((profile) => {
      it(`profile ${profile} has exactly 5 configured axes`, () => {
        const axes = RADAR_CONFIGS[profile];
        expect(axes).toBeDefined();
        expect(axes.length).toBe(5);

        axes.forEach((axis) => {
          expect(axis.key).toBeTruthy();
          expect(axis.label).toBeTruthy();
          expect(axis.label).toBe(axis.label.toUpperCase());
          expect(axis.max).toBeGreaterThan(axis.min);
          expect(typeof axis.calculate).toBe('function');
        });
      });
    });
  });

  // =========================================================================
  // 6. getRadarMetrics & calculateRadarScores (Calculations & Boundary Output)
  // =========================================================================
  describe('getRadarMetrics & calculateRadarScores', () => {
    it('returns 5 fallback zero-axes when statistic is null or undefined', () => {
      const fallbackMetrics = getRadarMetrics('ST', null);
      expect(fallbackMetrics).toHaveLength(5);
      fallbackMetrics.forEach((m) => {
        expect(m.value).toBe(0);
        expect(m.rawValue).toBe('—');
      });

      const fallbackFromScores = calculateRadarScores(undefined, 'GK');
      expect(fallbackFromScores).toHaveLength(5);
      fallbackFromScores.forEach((m) => {
        expect(m.value).toBe(0);
        expect(m.rawValue).toBe('—');
      });
    });

    it('safely handles stats with zero minutes played without NaN or division by zero', () => {
      const zeroMinutesStat = {
        minutesPlayed: 0,
        appearances: 0,
        starts: 0,
        goals: 0,
        assists: 0,
        passesAttempted: 0,
        passesCompleted: 0,
        tackles: 0,
        interceptions: 0,
        shots: 0,
        keyPasses: 0,
      };

      const profiles: TacticalRadarProfile[] = [
        'GK',
        'CB',
        'FULLBACK',
        'CDM',
        'CM',
        'CAM',
        'WIDE',
        'ATT',
      ];

      profiles.forEach((p) => {
        const metrics = calculateRadarScores(zeroMinutesStat, p);
        expect(metrics).toHaveLength(5);
        metrics.forEach((m) => {
          expect(Number.isFinite(m.value)).toBe(true);
          expect(m.value).toBeGreaterThanOrEqual(0);
          expect(m.value).toBeLessThanOrEqual(100);
          expect(typeof m.rawValue).toBe('string');
        });
      });
    });

    it('calculates expected non-zero radar metrics for an Attacker (ATT)', () => {
      const strikerStat = {
        minutesPlayed: 900,
        appearances: 10,
        goals: 8,
        shots: 30,
        assists: 3,
        keyPasses: 15,
      };

      const metrics = calculateRadarScores(strikerStat, 'ST');
      expect(metrics).toHaveLength(5);

      const scoringMetric = metrics.find((m) => m.key === 'scoring');
      expect(scoringMetric).toBeDefined();
      expect(scoringMetric!.label).toBe('SCORING');
      // 8 goals / 10 90s = 0.8 goals/90 -> normalized against min 0, max 1.0 => 80
      expect(scoringMetric!.value).toBe(80);
      expect(scoringMetric!.rawValue).toBe('0.80/90');

      const shootingMetric = metrics.find((m) => m.key === 'shooting');
      expect(shootingMetric).toBeDefined();
      // 30 shots / 10 90s = 3.0 shots/90 -> normalized against min 0, max 4.5 => (3/4.5)*100 = 67
      expect(shootingMetric!.value).toBe(67);
      expect(shootingMetric!.rawValue).toBe('3.00/90');

      const conversionMetric = metrics.find((m) => m.key === 'goalConversion');
      expect(conversionMetric).toBeDefined();
      // 8 / 30 = 26.67% -> min 0, max 35 => (26.666/35)*100 = 76
      expect(conversionMetric!.value).toBe(76);
      expect(conversionMetric!.rawValue).toBe('26.7%');
    });

    it('calculates expected non-zero radar metrics for a Goalkeeper (GK)', () => {
      const gkStat = {
        minutesPlayed: 1800, // 20 full matches
        appearances: 20,
        saves: 70,
        savesPer90: 3.5,
        cleanSheets: 8,
        passAccuracy: 75.0,
        goalsConceded: 18,
        goalsConcededPer90: 0.9,
        passesPer90: 25.0,
      };

      const metrics = calculateRadarScores(gkStat, 'GK');
      expect(metrics).toHaveLength(5);

      const shotStopping = metrics.find((m) => m.key === 'shotStopping');
      expect(shotStopping).toBeDefined();
      // 3.5 saves/90 against 0 to 5.0 => 70
      expect(shotStopping!.value).toBe(70);
      expect(shotStopping!.rawValue).toBe('3.50/90');

      const cleanSheets = metrics.find((m) => m.key === 'cleanSheets');
      expect(cleanSheets).toBeDefined();
      // 8 against min 0, max 16 => 50
      expect(cleanSheets!.value).toBe(50);
      expect(cleanSheets!.rawValue).toBe('8 CS');

      const goalPrevention = metrics.find((m) => m.key === 'goalPrevention');
      expect(goalPrevention).toBeDefined();
      // 0.9 GA/90 with inverse between 0.6 and 2.4 => ((0.9-0.6)/1.8)*100 = 16.67 => inverse = 83
      expect(goalPrevention!.value).toBe(83);
      expect(goalPrevention!.rawValue).toBe('0.90 GA/90');
    });

    it('calculates expected non-zero radar metrics for a Centre Back (CB)', () => {
      const cbStat = {
        minutesPlayed: 900,
        tackles: 20, // 2.0 / 90
        interceptions: 15, // 1.5 / 90
        passAccuracy: 88.0,
        passesPer90: 60.0,
      };

      const metrics = calculateRadarScores(cbStat, 'CB');
      expect(metrics).toHaveLength(5);

      const tackling = metrics.find((m) => m.key === 'tackles');
      expect(tackling).toBeDefined();
      // 2.0 against 0-3.5 => (2/3.5)*100 = 57
      expect(tackling!.value).toBe(57);

      const interception = metrics.find((m) => m.key === 'interceptions');
      expect(interception).toBeDefined();
      // 1.5 against 0-2.5 => (1.5/2.5)*100 = 60
      expect(interception!.value).toBe(60);

      const recovery = metrics.find((m) => m.key === 'ballRecovery');
      expect(recovery).toBeDefined();
      // (20+15)*90/900 = 3.5/90 against 0-5.5 => (3.5/5.5)*100 = 64
      expect(recovery!.value).toBe(64);
    });
  });
});
