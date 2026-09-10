export type TacticalRadarProfile =
  'GK' | 'CB' | 'FULLBACK' | 'CDM' | 'CM' | 'CAM' | 'WIDE' | 'ATT';

export type RadarProfile = TacticalRadarProfile;

export interface RadarMetric {
  key: string;
  label: string;
  value: number;
  rawValue: string;
}

export function normalizeMetric(
  val: number | null | undefined,
  min: number,
  max: number,
  inverse = false,
): number {
  if (val === null || val === undefined || isNaN(val)) return 0;
  if (val <= 0 && !inverse) return 0;

  const clamped = Math.max(min, Math.min(max, val));
  let normalized = ((clamped - min) / (max - min)) * 100;
  if (inverse) {
    normalized = 100 - normalized;
  }
  return Math.round(Math.max(0, Math.min(100, normalized)));
}

export function getRadarProfile(posCode?: string | null): TacticalRadarProfile {
  if (!posCode) return 'CM';
  const upper = posCode.trim().toUpperCase();

  if (upper === 'GK') return 'GK';
  if (upper === 'CB') return 'CB';
  if (['LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(upper)) return 'FULLBACK';
  if (['CDM', 'DM'].includes(upper)) return 'CDM';
  if (upper === 'CM') return 'CM';
  if (['CAM', 'AM'].includes(upper)) return 'CAM';
  if (['LM', 'RM'].includes(upper)) return 'WIDE';
  if (['LW', 'RW', 'CF', 'ST', 'FW', 'FWD', 'ATT', 'FORWARD'].includes(upper))
    return 'ATT';

  return 'CM';
}

export function getRadarProfileTitle(profile: TacticalRadarProfile): string {
  switch (profile) {
    case 'GK':
      return 'GOALKEEPER';
    case 'CB':
      return 'CENTRE BACK';
    case 'FULLBACK':
      return 'FULLBACK / WING BACK';
    case 'CDM':
      return 'DEFENSIVE MIDFIELDER';
    case 'CM':
      return 'CENTRAL MIDFIELDER';
    case 'CAM':
      return 'ATTACKING MIDFIELDER';
    case 'WIDE':
      return 'WIDE MIDFIELDER';
    case 'ATT':
      return 'ATTACKER';
  }
}

export function getRadarMetrics(
  posCodeOrCategory?: string | null,
  stat?: any,
): RadarMetric[] {
  if (!stat) {
    return [
      { key: 'metric1', label: 'METRIC 1', value: 0, rawValue: '—' },
      { key: 'metric2', label: 'METRIC 2', value: 0, rawValue: '—' },
      { key: 'metric3', label: 'METRIC 3', value: 0, rawValue: '—' },
      { key: 'metric4', label: 'METRIC 4', value: 0, rawValue: '—' },
      { key: 'metric5', label: 'METRIC 5', value: 0, rawValue: '—' },
    ];
  }

  const profile = getRadarProfile(posCodeOrCategory);
  const minutes = stat.minutesPlayed ?? 0;
  const passAcc =
    stat.passAccuracy ??
    (stat.passesAttempted > 0
      ? (stat.passesCompleted / stat.passesAttempted) * 100
      : 0);
  const passesP90 =
    stat.passesPer90 ??
    (minutes > 0 ? (stat.passesAttempted * 90) / minutes : 0);
  const keyPassesP90 =
    stat.keyPassesPer90 ?? (minutes > 0 ? (stat.keyPasses * 90) / minutes : 0);
  const tacklesP90 =
    stat.tacklesPer90 ?? (minutes > 0 ? (stat.tackles * 90) / minutes : 0);
  const intP90 =
    stat.interceptionsPer90 ??
    (minutes > 0 ? (stat.interceptions * 90) / minutes : 0);
  const goalsP90 =
    stat.goalsPer90 ?? (minutes > 0 ? (stat.goals * 90) / minutes : 0);
  const assistsP90 =
    stat.assistsPer90 ?? (minutes > 0 ? (stat.assists * 90) / minutes : 0);
  const shotsP90 =
    stat.shotsPer90 ?? (minutes > 0 ? (stat.shots * 90) / minutes : 0);

  const ballRecovery = tacklesP90 + intP90;
  const goalThreat = goalsP90 + assistsP90;
  const goalConversion = stat.shots > 0 ? (stat.goals / stat.shots) * 100 : 0;

  switch (profile) {
    case 'GK': {
      const savesP90 =
        stat.savesPer90 ??
        (minutes > 0 && stat.saves ? (stat.saves * 90) / minutes : 0);
      const cleanSheets = stat.cleanSheets ?? 0;
      const gcP90 =
        stat.goalsConcededPer90 ??
        (minutes > 0 && stat.goalsConceded
          ? (stat.goalsConceded * 90) / minutes
          : 1.5);

      return [
        {
          key: 'shotStopping',
          label: 'SHOT STOPPING',
          value: normalizeMetric(savesP90, 0, 5.0),
          rawValue: `${savesP90.toFixed(2)}/90`,
        },
        {
          key: 'cleanSheets',
          label: 'CLEAN SHEETS',
          value: normalizeMetric(cleanSheets, 0, 16),
          rawValue: `${cleanSheets} CS`,
        },
        {
          key: 'distribution',
          label: 'DISTRIBUTION',
          value: normalizeMetric(passAcc, 40, 90),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'goalPrevention',
          label: 'GOAL PREVENTION',
          value: normalizeMetric(gcP90, 0.6, 2.4, true),
          rawValue: `${gcP90.toFixed(2)} GA/90`,
        },
        {
          key: 'passingVolume',
          label: 'PASSING VOLUME',
          value: normalizeMetric(passesP90, 10, 45),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
      ];
    }
    case 'CB': {
      return [
        {
          key: 'tackles',
          label: 'TACKLING',
          value: normalizeMetric(tacklesP90, 0, 3.5),
          rawValue: `${tacklesP90.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 2.5),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'ballRecovery',
          label: 'BALL RECOVERY',
          value: normalizeMetric(ballRecovery, 0, 5.5),
          rawValue: `${ballRecovery.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'buildUp',
          label: 'BUILD-UP',
          value: normalizeMetric(passesP90, 0, 80),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
      ];
    }
    case 'FULLBACK': {
      return [
        {
          key: 'tackles',
          label: 'TACKLING',
          value: normalizeMetric(tacklesP90, 0, 3.5),
          rawValue: `${tacklesP90.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 2.5),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 60, 92),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 75),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 2.5),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
      ];
    }
    case 'CDM': {
      return [
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 85),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 70, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'ballRecovery',
          label: 'BALL RECOVERY',
          value: normalizeMetric(ballRecovery, 0, 6.0),
          rawValue: `${ballRecovery.toFixed(2)}/90`,
        },
        {
          key: 'interceptions',
          label: 'INTERCEPTIONS',
          value: normalizeMetric(intP90, 0, 3.0),
          rawValue: `${intP90.toFixed(2)}/90`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 2.5),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
      ];
    }
    case 'CM': {
      return [
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 80),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 95),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 3.0),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'ballRecovery',
          label: 'BALL RECOVERY',
          value: normalizeMetric(ballRecovery, 0, 4.5),
          rawValue: `${ballRecovery.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 0.8),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }
    case 'CAM': {
      return [
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 3.5),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 92),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'assists',
          label: 'ASSISTS',
          value: normalizeMetric(assistsP90, 0, 0.6),
          rawValue: `${assistsP90.toFixed(2)}/90`,
        },
        {
          key: 'scoring',
          label: 'SCORING',
          value: normalizeMetric(goalsP90, 0, 0.7),
          rawValue: `${goalsP90.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 1.0),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }
    case 'WIDE': {
      return [
        {
          key: 'passVolume',
          label: 'PASS VOLUME',
          value: normalizeMetric(passesP90, 0, 65),
          rawValue: `${passesP90.toFixed(1)}/90`,
        },
        {
          key: 'passAccuracy',
          label: 'PASS ACCURACY',
          value: normalizeMetric(passAcc, 65, 92),
          rawValue: `${passAcc.toFixed(1)}%`,
        },
        {
          key: 'creativity',
          label: 'CREATIVITY',
          value: normalizeMetric(keyPassesP90, 0, 2.8),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'scoring',
          label: 'SCORING',
          value: normalizeMetric(goalsP90, 0, 0.5),
          rawValue: `${goalsP90.toFixed(2)}/90`,
        },
        {
          key: 'goalThreat',
          label: 'GOAL THREAT',
          value: normalizeMetric(goalThreat, 0, 0.9),
          rawValue: `${goalThreat.toFixed(2)}/90`,
        },
      ];
    }
    case 'ATT':
    default: {
      return [
        {
          key: 'scoring',
          label: 'SCORING',
          value: normalizeMetric(goalsP90, 0, 1.0),
          rawValue: `${goalsP90.toFixed(2)}/90`,
        },
        {
          key: 'shooting',
          label: 'SHOOTING',
          value: normalizeMetric(shotsP90, 0, 4.5),
          rawValue: `${shotsP90.toFixed(2)}/90`,
        },
        {
          key: 'goalConversion',
          label: 'GOAL CONVERSION',
          value: normalizeMetric(goalConversion, 0, 35.0),
          rawValue: `${goalConversion.toFixed(1)}%`,
        },
        {
          key: 'chanceCreation',
          label: 'CHANCE CREATION',
          value: normalizeMetric(keyPassesP90, 0, 2.8),
          rawValue: `${keyPassesP90.toFixed(2)}/90`,
        },
        {
          key: 'assists',
          label: 'ASSISTS',
          value: normalizeMetric(assistsP90, 0, 0.5),
          rawValue: `${assistsP90.toFixed(2)}/90`,
        },
      ];
    }
  }
}

describe('Player Comparison Radar Profile Determination (Unit Tests)', () => {
  const dummyStatsA = {
    minutesPlayed: 1800,
    goals: 10,
    assists: 5,
    shots: 40,
    passesAttempted: 800,
    passesCompleted: 650,
    passAccuracy: 81.25,
    keyPasses: 35,
    tackles: 25,
    interceptions: 15,
    goalsPer90: 0.5,
    assistsPer90: 0.25,
    shotsPer90: 2.0,
    passesPer90: 40.0,
    keyPassesPer90: 1.75,
    tacklesPer90: 1.25,
    interceptionsPer90: 0.75,
  };

  const dummyStatsB = {
    minutesPlayed: 2000,
    goals: 6,
    assists: 8,
    shots: 30,
    passesAttempted: 1100,
    passesCompleted: 950,
    passAccuracy: 86.36,
    keyPasses: 45,
    tackles: 30,
    interceptions: 20,
    goalsPer90: 0.27,
    assistsPer90: 0.36,
    shotsPer90: 1.35,
    passesPer90: 49.5,
    keyPassesPer90: 2.02,
    tacklesPer90: 1.35,
    interceptionsPer90: 0.9,
  };

  // Test 1 — CAM Comparison
  it('Test 1: should use CAM Radar Profile for both Player A and Player B when selectedComparisonPosition is CAM', () => {
    const selectedPosition = 'CAM';
    const profile = getRadarProfile(selectedPosition);
    expect(profile).toBe('CAM');

    const metricsA = getRadarMetrics(selectedPosition, dummyStatsA);
    const metricsB = getRadarMetrics(selectedPosition, dummyStatsB);

    expect(metricsA).toHaveLength(5);
    expect(metricsB).toHaveLength(5);

    const expectedKeys = [
      'creativity',
      'passAccuracy',
      'assists',
      'scoring',
      'goalThreat',
    ];
    expect(metricsA.map((m) => m.key)).toEqual(expectedKeys);
    expect(metricsB.map((m) => m.key)).toEqual(expectedKeys);

    const expectedLabels = [
      'CREATIVITY',
      'PASS ACCURACY',
      'ASSISTS',
      'SCORING',
      'GOAL THREAT',
    ];
    expect(metricsA.map((m) => m.label)).toEqual(expectedLabels);
    expect(metricsB.map((m) => m.label)).toEqual(expectedLabels);
  });

  // Test 2 — CM Comparison
  it('Test 2: should use CM Radar Profile for both players when selectedComparisonPosition is CM', () => {
    const selectedPosition = 'CM';
    const profile = getRadarProfile(selectedPosition);
    expect(profile).toBe('CM');

    const metricsA = getRadarMetrics(selectedPosition, dummyStatsA);
    const metricsB = getRadarMetrics(selectedPosition, dummyStatsB);

    const expectedKeys = [
      'passVolume',
      'passAccuracy',
      'creativity',
      'ballRecovery',
      'goalThreat',
    ];
    expect(metricsA.map((m) => m.key)).toEqual(expectedKeys);
    expect(metricsB.map((m) => m.key)).toEqual(expectedKeys);

    const expectedLabels = [
      'PASS VOLUME',
      'PASS ACCURACY',
      'CREATIVITY',
      'BALL RECOVERY',
      'GOAL THREAT',
    ];
    expect(metricsA.map((m) => m.label)).toEqual(expectedLabels);
    expect(metricsB.map((m) => m.label)).toEqual(expectedLabels);
  });

  // Test 3 — Position Switch from CAM to CM
  it('Test 3: should dynamically switch radar profile and metric axes when selectedComparisonPosition changes', () => {
    let currentPosition = 'CAM';
    let profile = getRadarProfile(currentPosition);
    expect(profile).toBe('CAM');
    let metrics = getRadarMetrics(currentPosition, dummyStatsA);
    expect(metrics.find((m) => m.key === 'scoring')).toBeDefined();

    // User switches to CM
    currentPosition = 'CM';
    profile = getRadarProfile(currentPosition);
    expect(profile).toBe('CM');
    metrics = getRadarMetrics(currentPosition, dummyStatsA);
    expect(metrics.find((m) => m.key === 'scoring')).toBeUndefined();
    expect(metrics.find((m) => m.key === 'passVolume')).toBeDefined();
  });

  // Test 4 — Does NOT use primaryPosition (uses selected comparison position)
  it('Test 4: should use selectedComparisonPosition even if player has a different primaryPosition', () => {
    const playerA = {
      id: 'p1',
      fullName: 'Kevin De Bruyne',
      primaryPosition: 'CAM',
      positions: [{ positionCode: 'CAM' }, { positionCode: 'CM' }],
    };

    // When comparing as CM, Player A must use CM profile, not CAM primary position
    const selectedComparisonPosition = 'CM';
    const profile = getRadarProfile(selectedComparisonPosition);
    expect(profile).toBe('CM');
    expect(profile).not.toBe(playerA.primaryPosition);

    const metrics = getRadarMetrics(selectedComparisonPosition, dummyStatsA);
    expect(metrics[0].key).toBe('passVolume');
  });

  // Test 5 — Same profile for comparison
  it('Test 5: should evaluate both players on identical profile and benchmark scale regardless of their other positions', () => {
    const selectedComparisonPosition = 'CAM';
    const profileA = getRadarProfile(selectedComparisonPosition);
    const profileB = getRadarProfile(selectedComparisonPosition);

    expect(profileA).toBe('CAM');
    expect(profileB).toBe('CAM');

    const metricsA = getRadarMetrics(selectedComparisonPosition, dummyStatsA);
    const metricsB = getRadarMetrics(selectedComparisonPosition, dummyStatsB);

    for (let i = 0; i < 5; i++) {
      expect(metricsA[i].key).toBe(metricsB[i].key);
      expect(metricsA[i].label).toBe(metricsB[i].label);
    }
  });

  // Test 6 — Position to Radar Profile Mapping Coverage (8 Tactical Profiles)
  it('Test 6: should map all standard positions correctly into 8 Tactical Radar Profiles', () => {
    expect(getRadarProfile('GK')).toBe('GK');

    expect(getRadarProfile('CB')).toBe('CB');
    expect(getRadarProfile('LB')).toBe('FULLBACK');
    expect(getRadarProfile('RB')).toBe('FULLBACK');
    expect(getRadarProfile('LWB')).toBe('FULLBACK');
    expect(getRadarProfile('RWB')).toBe('FULLBACK');

    expect(getRadarProfile('CDM')).toBe('CDM');
    expect(getRadarProfile('DM')).toBe('CDM');

    expect(getRadarProfile('CM')).toBe('CM');

    expect(getRadarProfile('CAM')).toBe('CAM');
    expect(getRadarProfile('AM')).toBe('CAM');

    expect(getRadarProfile('LM')).toBe('WIDE');
    expect(getRadarProfile('RM')).toBe('WIDE');

    expect(getRadarProfile('LW')).toBe('ATT');
    expect(getRadarProfile('RW')).toBe('ATT');
    expect(getRadarProfile('CF')).toBe('ATT');
    expect(getRadarProfile('ST')).toBe('ATT');
    expect(getRadarProfile('FW')).toBe('ATT');
  });

  // Test 7 — Safe dual profiles when comparing players across different positions
  it('Test 7: should safely support independent radar profiles when comparing different positions', () => {
    const posA = 'CB';
    const posB = 'RB';

    const profileA = getRadarProfile(posA);
    const profileB = getRadarProfile(posB);

    expect(profileA).toBe('CB');
    expect(profileB).toBe('FULLBACK');

    expect(getRadarProfileTitle(profileA)).toBe('CENTRE BACK');
    expect(getRadarProfileTitle(profileB)).toBe('FULLBACK / WING BACK');

    const metricsA = getRadarMetrics(posA, dummyStatsA);
    const metricsB = getRadarMetrics(posB, dummyStatsB);

    expect(metricsA).toHaveLength(5);
    expect(metricsB).toHaveLength(5);
    // CB has BUILD-UP as 5th axis, FULLBACK has CREATIVITY as 5th axis
    expect(metricsA[4].label).toBe('BUILD-UP');
    expect(metricsB[4].label).toBe('CREATIVITY');
  });
});
