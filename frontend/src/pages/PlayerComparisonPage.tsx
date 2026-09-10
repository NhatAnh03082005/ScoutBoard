import React, { useState, useEffect, useMemo } from 'react';
import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
  ComparisonScopeType,
} from '../types/player.types';
import { getPlayerByIdApi, getPlayerSeasonStatisticsApi } from '../services/player.service';
import {
  getRadarMetrics,
  getRadarProfile,
  getRadarProfileTitle,
} from '../utils/radar.utils';
import { ComparisonRadarChart } from '../components/player/ComparisonRadarChart';
import { AddToShortlistModal } from '../components/shortlist/AddToShortlistModal';
import { getNationalityFlagUrl } from '../utils/nationality-flag.util';

interface PlayerComparisonPageProps {
  playerAId: string;
  playerBId: string;
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId?: string;
  onBackToSetup: () => void;
  onBackToDetail: () => void;
}

interface AggregatedStats {
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  goalConversion: number | null;

  // Derived Outfield Per-90 Metrics
  goalsPer90: number | null;
  assistsPer90: number | null;
  shotsPer90: number | null;
  goalThreatPer90: number | null;
  passesPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;
  recoveriesPer90: number | null;

  // Goalkeeper Specific Metrics
  saves: number;
  goalsConceded: number;
  cleanSheets: number;
  penaltiesSaved: number;
  savesPer90: number | null;
  goalsConcededPer90: number | null;
  savePercentage: number | null;
  cleanSheetPercentage: number | null;
}

interface MetricConfig {
  label: string;
  getValue: (stats: AggregatedStats | null) => number | null | undefined;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

interface ThemeStyles {
  border: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  winnerBg: string;
  winnerColor: string;
  winnerBorder?: string;
}

interface MetricSection {
  title: string;
  icon: string;
  theme: ThemeStyles;
  metrics: MetricConfig[];
}

const OUTFIELD_METRIC_SECTIONS: MetricSection[] = [
  {
    title: 'PLAYING TIME',
    icon: '⏱',
    theme: {
      border: '2px solid #cbd5e1',
      headerBorder: '1px solid #cbd5e1',
      badgeBg: '#1e293b',
      badgeText: '#ffffff',
      winnerBg: '#f1f5f9',
      winnerColor: '#0f172a',
      winnerBorder: 'none',
    },
    metrics: [
      { label: 'MATCHES', getValue: (s) => s?.appearances, higherIsBetter: true },
      { label: 'STARTS', getValue: (s) => s?.starts, higherIsBetter: true },
      { label: 'MINUTES PLAYED', getValue: (s) => s?.minutesPlayed, higherIsBetter: true },
    ],
  },
  {
    title: 'ATTACKING OUTPUT',
    icon: '⚡',
    theme: {
      border: '2px solid #fecdd3',
      headerBorder: '1px solid #fecdd3',
      badgeBg: '#e11d48',
      badgeText: '#ffffff',
      winnerBg: '#fff1f2',
      winnerColor: '#be123c',
      winnerBorder: '1px solid #ffe4e6',
    },
    metrics: [
      { label: 'GOALS', getValue: (s) => s?.goals, higherIsBetter: true },
      { label: 'ASSISTS', getValue: (s) => s?.assists, higherIsBetter: true },
      { label: 'SHOTS', getValue: (s) => s?.shots, higherIsBetter: true },
      { label: 'GOAL CONVERSION %', getValue: (s) => s?.goalConversion, isPercentage: true, higherIsBetter: true },
      { label: 'GOALS / 90', getValue: (s) => s?.goalsPer90, higherIsBetter: true },
      { label: 'ASSISTS / 90', getValue: (s) => s?.assistsPer90, higherIsBetter: true },
      { label: 'SHOTS / 90', getValue: (s) => s?.shotsPer90, higherIsBetter: true },
      { label: 'GOAL THREAT / 90', getValue: (s) => s?.goalThreatPer90, higherIsBetter: true },
    ],
  },
  {
    title: 'PASSING & CREATIVITY',
    icon: '🎯',
    theme: {
      border: '2px solid #bfdbfe',
      headerBorder: '1px solid #bfdbfe',
      badgeBg: '#2563eb',
      badgeText: '#ffffff',
      winnerBg: '#eff6ff',
      winnerColor: '#1d4ed8',
      winnerBorder: '1px solid #dbeafe',
    },
    metrics: [
      { label: 'PASSES ATTEMPTED', getValue: (s) => s?.passesAttempted, higherIsBetter: true },
      { label: 'PASSES COMPLETED', getValue: (s) => s?.passesCompleted, higherIsBetter: true },
      { label: 'PASS ACCURACY', getValue: (s) => s?.passAccuracy, isPercentage: true, higherIsBetter: true },
      { label: 'KEY PASSES', getValue: (s) => s?.keyPasses, higherIsBetter: true },
      { label: 'PASSES / 90', getValue: (s) => s?.passesPer90, higherIsBetter: true },
      { label: 'KEY PASSES / 90', getValue: (s) => s?.keyPassesPer90, higherIsBetter: true },
    ],
  },
  {
    title: 'DEFENDING',
    icon: '🛡️',
    theme: {
      border: '2px solid #a7f3d0',
      headerBorder: '1px solid #a7f3d0',
      badgeBg: '#059669',
      badgeText: '#ffffff',
      winnerBg: '#ecfdf5',
      winnerColor: '#047857',
      winnerBorder: '1px solid #d1fae5',
    },
    metrics: [
      { label: 'TACKLES', getValue: (s) => s?.tackles, higherIsBetter: true },
      { label: 'INTERCEPTIONS', getValue: (s) => s?.interceptions, higherIsBetter: true },
      { label: 'BALL RECOVERIES', getValue: (s) => s?.recoveries, higherIsBetter: true },
      { label: 'TACKLES / 90', getValue: (s) => s?.tacklesPer90, higherIsBetter: true },
      { label: 'INTERCEPTIONS / 90', getValue: (s) => s?.interceptionsPer90, higherIsBetter: true },
      { label: 'BALL RECOVERY / 90', getValue: (s) => s?.recoveriesPer90, higherIsBetter: true },
    ],
  },
];

const GOALKEEPER_METRIC_SECTIONS: MetricSection[] = [
  {
    title: 'PLAYING TIME',
    icon: '⏱',
    theme: {
      border: '2px solid #cbd5e1',
      headerBorder: '1px solid #cbd5e1',
      badgeBg: '#1e293b',
      badgeText: '#ffffff',
      winnerBg: '#f1f5f9',
      winnerColor: '#0f172a',
      winnerBorder: 'none',
    },
    metrics: [
      { label: 'MATCHES', getValue: (s) => s?.appearances, higherIsBetter: true },
      { label: 'STARTS', getValue: (s) => s?.starts, higherIsBetter: true },
      { label: 'MINUTES PLAYED', getValue: (s) => s?.minutesPlayed, higherIsBetter: true },
    ],
  },
  {
    title: 'GOALKEEPING & SHOT STOPPING',
    icon: '🧤',
    theme: {
      border: '2px solid #fde68a',
      headerBorder: '1px solid #fde68a',
      badgeBg: '#d97706',
      badgeText: '#ffffff',
      winnerBg: '#fffbeb',
      winnerColor: '#92400e',
      winnerBorder: '1px solid #fef3c7',
    },
    metrics: [
      { label: 'SAVES', getValue: (s) => s?.saves, higherIsBetter: true },
      { label: 'GOALS CONCEDED', getValue: (s) => s?.goalsConceded, higherIsBetter: false }, // Lower is better!
      { label: 'CLEAN SHEETS', getValue: (s) => s?.cleanSheets, higherIsBetter: true },
      { label: 'PENALTIES SAVED', getValue: (s) => s?.penaltiesSaved, higherIsBetter: true },
      { label: 'SAVES / 90', getValue: (s) => s?.savesPer90, higherIsBetter: true },
      { label: 'GOALS CONCEDED / 90', getValue: (s) => s?.goalsConcededPer90, higherIsBetter: false }, // Lower is better!
      { label: 'SAVE %', getValue: (s) => s?.savePercentage, isPercentage: true, higherIsBetter: true },
      { label: 'CLEAN SHEET %', getValue: (s) => s?.cleanSheetPercentage, isPercentage: true, higherIsBetter: true },
    ],
  },
  {
    title: 'DISTRIBUTION',
    icon: '⚽',
    theme: {
      border: '2px solid #bfdbfe',
      headerBorder: '1px solid #bfdbfe',
      badgeBg: '#2563eb',
      badgeText: '#ffffff',
      winnerBg: '#eff6ff',
      winnerColor: '#1d4ed8',
      winnerBorder: '1px solid #dbeafe',
    },
    metrics: [
      { label: 'PASSES ATTEMPTED', getValue: (s) => s?.passesAttempted, higherIsBetter: true },
      { label: 'PASSES COMPLETED', getValue: (s) => s?.passesCompleted, higherIsBetter: true },
      { label: 'PASS ACCURACY', getValue: (s) => s?.passAccuracy, isPercentage: true, higherIsBetter: true },
      { label: 'PASSES / 90', getValue: (s) => s?.passesPer90, higherIsBetter: true },
    ],
  },
];

const calculateAge = (dateOfBirth?: string | null): string => {
  if (!dateOfBirth) return '—';
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} YRS`;
};

const formatNumber = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number.isInteger(val) ? String(val) : val.toFixed(decimals);
};

export const PlayerComparisonPage: React.FC<PlayerComparisonPageProps> = ({
  playerAId,
  playerBId,
  scope,
  seasonId,
  competitionId,
  onBackToSetup,
  onBackToDetail,
}) => {
  // 1. Data States
  const [playerA, setPlayerA] = useState<PlayerDetail | null>(null);
  const [playerB, setPlayerB] = useState<PlayerDetail | null>(null);
  const [statsA, setStatsA] = useState<PlayerSeasonStatisticItem[]>([]);
  const [statsB, setStatsB] = useState<PlayerSeasonStatisticItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shortlistTargetPlayer, setShortlistTargetPlayer] = useState<PlayerDetail | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Comparison Position State
  const [selectedComparisonPosition, setSelectedComparisonPosition] = useState<string>('CM');

  // Extract all position codes for a player
  const getPlayerPositionCodes = (player: PlayerDetail | null): string[] => {
    if (!player) return [];
    const codes = new Set<string>();
    if (player.primaryPosition) {
      codes.add(player.primaryPosition.trim().toUpperCase());
    }
    if (player.positions && Array.isArray(player.positions)) {
      player.positions.forEach((p) => {
        if (p.positionCode) {
          codes.add(p.positionCode.trim().toUpperCase());
        }
      });
    }
    return Array.from(codes);
  };

  const positionsA = useMemo(() => getPlayerPositionCodes(playerA), [playerA]);
  const positionsB = useMemo(() => getPlayerPositionCodes(playerB), [playerB]);
  const commonPositions = useMemo(() => {
    return positionsA.filter((p) => positionsB.includes(p));
  }, [positionsA, positionsB]);

  // Sync selectedComparisonPosition with common positions
  useEffect(() => {
    if (commonPositions.length > 0 && !commonPositions.includes(selectedComparisonPosition)) {
      setSelectedComparisonPosition(commonPositions[0]);
    }
  }, [commonPositions, selectedComparisonPosition]);

  // 3. Data Fetching Effect
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getPlayerByIdApi(playerAId),
      getPlayerByIdApi(playerBId),
      getPlayerSeasonStatisticsApi(playerAId),
      getPlayerSeasonStatisticsApi(playerBId),
    ])
      .then(([pA, pB, sA, sB]) => {
        if (isMounted) {
          setPlayerA(pA);
          setPlayerB(pB);
          setStatsA(sA);
          setStatsB(sB);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Unable to load player comparison data');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [playerAId, playerBId]);

  // Aggregate or Extract Stats for a Player based on Scope
  const extractStats = (records: PlayerSeasonStatisticItem[]): AggregatedStats | null => {
    if (!records || records.length === 0) return null;

    let targetRecords: PlayerSeasonStatisticItem[] = [];

    if (scope === 'COMPETITION' && competitionId) {
      targetRecords = records.filter(
        (r) => r.season?.id === seasonId && r.competition?.id === competitionId,
      );
    } else {
      const targetSeasonRecord =
        statsA.find((s) => s.season?.id === seasonId) ||
        statsB.find((s) => s.season?.id === seasonId);
      const targetSeasonCode = targetSeasonRecord?.season?.seasonCode;

      targetRecords = records.filter(
        (r) =>
          r.season?.id === seasonId ||
          (targetSeasonCode && r.season?.seasonCode === targetSeasonCode),
      );
    }

    if (targetRecords.length === 0) return null;

    // Sum raw metrics
    let appearances = 0;
    let starts = 0;
    let minutesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let shots = 0;
    let passesAttempted = 0;
    let passesCompleted = 0;
    let keyPasses = 0;
    let tackles = 0;
    let interceptions = 0;

    // Goalkeeper raw metrics
    let saves = 0;
    let goalsConceded = 0;
    let cleanSheets = 0;
    let penaltiesSaved = 0;

    targetRecords.forEach((r) => {
      appearances += r.appearances || 0;
      starts += r.starts || 0;
      minutesPlayed += r.minutesPlayed || 0;
      goals += r.goals || 0;
      assists += r.assists || 0;
      shots += r.shots || 0;
      passesAttempted += r.passesAttempted || 0;
      passesCompleted += r.passesCompleted || 0;
      keyPasses += r.keyPasses || 0;
      tackles += r.tackles || 0;
      interceptions += r.interceptions || 0;

      if (r.saves !== null && r.saves !== undefined) {
        saves += r.saves;
      }
      if (r.goalsConceded !== null && r.goalsConceded !== undefined) {
        goalsConceded += r.goalsConceded;
      }
      if (r.cleanSheets !== null && r.cleanSheets !== undefined) {
        cleanSheets += r.cleanSheets;
      }
      if (r.penaltiesSaved !== null && r.penaltiesSaved !== undefined) {
        penaltiesSaved += r.penaltiesSaved;
      }
    });

    // Derived pass accuracy
    const passAccuracy =
      passesAttempted > 0
        ? Number(((passesCompleted / passesAttempted) * 100).toFixed(2))
        : null;

    // Derived goal conversion
    const goalConversion =
      shots > 0
        ? Number(((goals / shots) * 100).toFixed(2))
        : null;

    const recoveries = tackles + interceptions;

    // Derived per 90 metrics (guarded against division by zero)
    const calcPer90 = (val: number | null | undefined): number | null => {
      if (val === null || val === undefined || minutesPlayed <= 0) return null;
      return Number(((val * 90) / minutesPlayed).toFixed(2));
    };

    // Goalkeeper rates
    const totalShotsFaced = saves + goalsConceded;
    const savePercentage =
      totalShotsFaced > 0
        ? Number(((saves / totalShotsFaced) * 100).toFixed(2))
        : null;

    const cleanSheetPercentage =
      appearances > 0
        ? Number(((cleanSheets / appearances) * 100).toFixed(2))
        : null;

    return {
      appearances,
      starts,
      minutesPlayed,
      goals,
      assists,
      shots,
      passesAttempted,
      passesCompleted,
      passAccuracy,
      keyPasses,
      tackles,
      interceptions,
      recoveries,
      goalConversion,
      goalsPer90: calcPer90(goals),
      assistsPer90: calcPer90(assists),
      shotsPer90: calcPer90(shots),
      goalThreatPer90: calcPer90(goals + assists),
      passesPer90: calcPer90(passesAttempted),
      keyPassesPer90: calcPer90(keyPasses),
      tacklesPer90: calcPer90(tackles),
      interceptionsPer90: calcPer90(interceptions),
      recoveriesPer90: calcPer90(recoveries),

      // Goalkeeper metrics
      saves,
      goalsConceded,
      cleanSheets,
      penaltiesSaved,
      savesPer90: calcPer90(saves),
      goalsConcededPer90: calcPer90(goalsConceded),
      savePercentage,
      cleanSheetPercentage,
    };
  };

  const processedStatsA = useMemo(() => extractStats(statsA), [statsA, scope, seasonId, competitionId]);
  const processedStatsB = useMemo(() => extractStats(statsB), [statsB, scope, seasonId, competitionId]);

  // Derive Radar Profile & Metrics strictly from selectedComparisonPosition or individual player primary positions
  const posA = selectedComparisonPosition || (commonPositions.length > 0 ? commonPositions[0] : (playerA?.primaryPosition?.trim().toUpperCase() || 'CM'));
  const posB = selectedComparisonPosition || (commonPositions.length > 0 ? commonPositions[0] : (playerB?.primaryPosition?.trim().toUpperCase() || 'CM'));
  const profileA = getRadarProfile(posA);
  const profileB = getRadarProfile(posB);
  const radarProfileTitle = getRadarProfileTitle(profileA);
  const radarProfileTitleB = profileA !== profileB ? getRadarProfileTitle(profileB) : undefined;

  const radarMetricsA = useMemo(() => {
    if (!processedStatsA) return [];
    return getRadarMetrics(profileA, processedStatsA as any);
  }, [profileA, processedStatsA]);

  const radarMetricsB = useMemo(() => {
    if (!processedStatsB) return [];
    return getRadarMetrics(profileB, processedStatsB as any);
  }, [profileB, processedStatsB]);

  // Context Info Labels
  const activeSeasonRecord =
    statsA.find((s) => s.season?.id === seasonId) ||
    statsB.find((s) => s.season?.id === seasonId);
  const seasonName = activeSeasonRecord?.season?.seasonCode || 'Season';

  let contextLabel = `${seasonName} · ALL COMPETITIONS`;
  if (scope === 'COMPETITION') {
    const compRecord =
      statsA.find((s) => s.competition?.id === competitionId) ||
      statsB.find((s) => s.competition?.id === competitionId);
    contextLabel = `${seasonName} · ${compRecord?.competition?.name || 'SPECIFIC COMPETITION'}`;
  }

  // Early Returns (ONLY AFTER ALL HOOKS HAVE BEEN CALLED)
  if (loading) {
    return (
      <div className="scout-b2b-page-container" style={{ background: 'rgba(241, 245, 249, 0.6)', minHeight: '100vh', padding: '24px 20px' }}>
        <div
          className="scout-b2b-control-card"
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 600,
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div className="scout-loading-spinner" style={{ margin: '0 auto 16px' }} />
          <div>Loading head-to-head comparison matrix...</div>
        </div>
      </div>
    );
  }

  if (error || !playerA || !playerB) {
    return (
      <div className="scout-b2b-page-container" style={{ background: 'rgba(241, 245, 249, 0.6)', minHeight: '100vh', padding: '24px 20px' }}>
        <div
          className="scout-b2b-alert-error"
          style={{ marginBottom: '20px', fontSize: '13.5px' }}
        >
          ⚠️ {error || 'Unable to display player comparison'}
        </div>
        <button
          type="button"
          className="scout-sports-back-btn"
          onClick={onBackToSetup}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Candidate Setup</span>
        </button>
      </div>
    );
  }

  // Determine Goalkeeper Comparison mode
  const isGoalkeeperComparison =
    playerA.primaryPosition?.trim().toUpperCase() === 'GK' &&
    playerB.primaryPosition?.trim().toUpperCase() === 'GK';

  const activeMetricSections = isGoalkeeperComparison
    ? GOALKEEPER_METRIC_SECTIONS
    : OUTFIELD_METRIC_SECTIONS;

  const nameA = playerA.fullName || playerA.name;
  const nameB = playerB.fullName || playerB.name;

  // Key Battles Selection
  const keyBattles = isGoalkeeperComparison
    ? [
        { label: 'SAVE %', valA: processedStatsA?.savePercentage, valB: processedStatsB?.savePercentage, isPercentage: true, higherIsBetter: true },
        { label: 'CLEAN SHEET %', valA: processedStatsA?.cleanSheetPercentage, valB: processedStatsB?.cleanSheetPercentage, isPercentage: true, higherIsBetter: true },
        { label: 'SAVES / 90', valA: processedStatsA?.savesPer90, valB: processedStatsB?.savesPer90, higherIsBetter: true },
        { label: 'GOALS CONCEDED / 90', valA: processedStatsA?.goalsConcededPer90, valB: processedStatsB?.goalsConcededPer90, higherIsBetter: false }, // Lower is better!
        { label: 'PASS ACCURACY', valA: processedStatsA?.passAccuracy, valB: processedStatsB?.passAccuracy, isPercentage: true, higherIsBetter: true },
        { label: 'PENALTIES SAVED', valA: processedStatsA?.penaltiesSaved, valB: processedStatsB?.penaltiesSaved, higherIsBetter: true },
      ]
    : [
        { label: 'GOALS', valA: processedStatsA?.goals, valB: processedStatsB?.goals, higherIsBetter: true },
        { label: 'ASSISTS', valA: processedStatsA?.assists, valB: processedStatsB?.assists, higherIsBetter: true },
        { label: 'GOAL CONVERSION', valA: processedStatsA?.goalConversion, valB: processedStatsB?.goalConversion, isPercentage: true, higherIsBetter: true },
        { label: 'KEY PASSES', valA: processedStatsA?.keyPasses, valB: processedStatsB?.keyPasses, higherIsBetter: true },
        { label: 'PASS ACCURACY', valA: processedStatsA?.passAccuracy, valB: processedStatsB?.passAccuracy, isPercentage: true, higherIsBetter: true },
        { label: 'BALL RECOVERIES', valA: processedStatsA?.recoveries, valB: processedStatsB?.recoveries, higherIsBetter: true },
      ];

  return (
    <div className="scout-b2b-page-container" style={{ background: 'rgba(241, 245, 249, 0.6)', minHeight: '100vh', padding: '24px 20px', paddingBottom: '48px' }}>
      {/* 0. Top Navigation Topbar */}
      <div className="scout-sports-topbar" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="scout-sports-back-btn"
            onClick={onBackToSetup}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Change Candidate / Scope</span>
          </button>

          <button
            type="button"
            className="scout-sports-back-btn"
            onClick={onBackToDetail}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Back to {nameA}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚖️ Step 2 of 2: Head-to-Head Comparison
          </span>
        </div>
      </div>

      {/* 1. MATCHUP HERO HEADER */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* PLAYER A (Left Aligned) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#1e293b',
                border: '1.5px solid rgba(59, 130, 246, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {playerA.imageUrl ? (
                <img
                  src={playerA.imageUrl}
                  alt={nameA}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '100%', height: '100%' }}
                >
                  <rect width="100" height="100" fill="#1e293b" />
                  <circle cx="50" cy="38" r="18" fill="#64748b" />
                  <path
                    d="M16 90C16 68 30 57 50 57C70 57 84 68 84 90V100H16V90Z"
                    fill="#64748b"
                  />
                </svg>
              )}
            </div>

            <div>
              {/* Player Name */}
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  color: '#60a5fa', // text-blue-400
                  lineHeight: 1.1,
                }}
              >
                {nameA}
              </div>

              {/* Subheader: Club, Position, Jersey */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  {playerA.currentTeam?.logoUrl && (
                    <img
                      src={playerA.currentTeam.logoUrl}
                      alt=""
                      style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                    />
                  )}
                  <span>{playerA.currentTeam?.name || 'FREE AGENT'}</span>
                </span>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    padding: '1px 7px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedComparisonPosition}
                </span>
                {playerA.shirtNumber && (
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                    #{playerA.shirtNumber}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShortlistTargetPlayer(playerA)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#93c5fd',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    textTransform: 'uppercase',
                  }}
                  title="Add to Shortlist"
                >
                  <span>+</span>
                  <span>Shortlist</span>
                </button>
              </div>

              {/* Player Bio details (Null fields completely hidden) */}
              {(() => {
                const flagA = getNationalityFlagUrl(playerA.nationality, playerA.nationalityFlagUrl);
                const ageA = playerA.dateOfBirth ? calculateAge(playerA.dateOfBirth) : null;
                const itemsA: React.ReactNode[] = [];
                if (playerA.nationality) {
                  itemsA.push(
                    <span key="nat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {flagA && (
                        <img
                          src={flagA}
                          alt=""
                          style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
                        />
                      )}
                      <span>{playerA.nationality.toUpperCase()}</span>
                    </span>
                  );
                }
                if (ageA && ageA !== '— YRS') {
                  itemsA.push(<span key="age">{ageA}</span>);
                }
                if (playerA.heightCm != null) {
                  itemsA.push(<span key="height">{playerA.heightCm} CM</span>);
                }
                if (playerA.weightKg != null) {
                  itemsA.push(<span key="weight">{playerA.weightKg} KG</span>);
                }
                return itemsA.length > 0 ? (
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#cbd5e1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {itemsA.map((node, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: '#64748b' }}>•</span>}
                        {node}
                      </React.Fragment>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {/* CENTER VS BADGE */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontWeight: 900,
                padding: '4px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                letterSpacing: '0.08em',
              }}
            >
              VS
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                textAlign: 'center',
                marginTop: '4px',
              }}
            >
              {contextLabel}
            </div>
          </div>

          {/* PLAYER B (Right Aligned) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '16px',
              textAlign: 'right',
            }}
          >
            <div>
              {/* Player Name */}
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  color: '#fbbf24', // text-amber-400
                  lineHeight: 1.1,
                }}
              >
                {nameB}
              </div>

              {/* Subheader: Club, Position, Jersey */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '4px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShortlistTargetPlayer(playerB)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fde68a',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    textTransform: 'uppercase',
                  }}
                  title="Add to Shortlist"
                >
                  <span>+</span>
                  <span>Shortlist</span>
                </button>
                {playerB.shirtNumber && (
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                    #{playerB.shirtNumber}
                  </span>
                )}
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    padding: '1px 7px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedComparisonPosition}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  {playerB.currentTeam?.logoUrl && (
                    <img
                      src={playerB.currentTeam.logoUrl}
                      alt=""
                      style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                    />
                  )}
                  <span>{playerB.currentTeam?.name || 'FREE AGENT'}</span>
                </span>
              </div>

              {/* Player Bio details (Null fields completely hidden) */}
              {(() => {
                const flagB = getNationalityFlagUrl(playerB.nationality, playerB.nationalityFlagUrl);
                const ageB = playerB.dateOfBirth ? calculateAge(playerB.dateOfBirth) : null;
                const itemsB: React.ReactNode[] = [];
                if (playerB.heightCm != null) {
                  itemsB.push(<span key="height">{playerB.heightCm} CM</span>);
                }
                if (playerB.weightKg != null) {
                  itemsB.push(<span key="weight">{playerB.weightKg} KG</span>);
                }
                if (ageB && ageB !== '— YRS') {
                  itemsB.push(<span key="age">{ageB}</span>);
                }
                if (playerB.nationality) {
                  itemsB.push(
                    <span key="nat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {flagB && (
                        <img
                          src={flagB}
                          alt=""
                          style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
                        />
                      )}
                      <span>{playerB.nationality.toUpperCase()}</span>
                    </span>
                  );
                }
                return itemsB.length > 0 ? (
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#cbd5e1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {itemsB.map((node, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: '#64748b' }}>•</span>}
                        {node}
                      </React.Fragment>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#1e293b',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {playerB.imageUrl ? (
                <img
                  src={playerB.imageUrl}
                  alt={nameB}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '100%', height: '100%' }}
                >
                  <rect width="100" height="100" fill="#1e293b" />
                  <circle cx="50" cy="38" r="18" fill="#64748b" />
                  <path
                    d="M16 90C16 68 30 57 50 57C70 57 84 68 84 90V100H16V90Z"
                    fill="#64748b"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 50-50 BALANCED GRID LAYOUT (Radar vs Key Battles) */}
      <div className="scout-comparison-grid">
        {/* LEFT COLUMN: Performance & Radar */}
        <div className="scout-comparison-left">
          <ComparisonRadarChart
            metricsA={radarMetricsA}
            metricsB={radarMetricsB}
            playerAName={nameA}
            playerBName={nameB}
            playerAHexColor="#3b82f6"
            playerBHexColor="#f59e0b"
            selectedPosition={selectedComparisonPosition}
            radarTitle={radarProfileTitle}
            radarTitleB={radarProfileTitleB}
            commonPositions={commonPositions}
            onSelectPosition={(pos) => setSelectedComparisonPosition(pos)}
          />
        </div>

        {/* RIGHT COLUMN: Key Battles Card */}
        <div
          className="scout-card scout-comparison-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <h3 className="scout-card-title scout-card-title-dark" style={{ marginBottom: '16px' }}>
            KEY BATTLES
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'space-around' }}>
            {keyBattles.map((battle) => {
              const vA = battle.valA ?? 0;
              const vB = battle.valB ?? 0;
              const higherIsBetter = battle.higherIsBetter !== false;

              let isWinnerA = false;
              let isWinnerB = false;
              if (battle.valA !== null && battle.valA !== undefined && battle.valB !== null && battle.valB !== undefined) {
                if (vA !== vB) {
                  if (higherIsBetter) {
                    isWinnerA = vA > vB;
                    isWinnerB = vB > vA;
                  } else {
                    isWinnerA = vA < vB;
                    isWinnerB = vB < vA;
                  }
                }
              }

              // Proportional ratio calculation: A / (A + B)
              let ratioA = 50;
              let ratioB = 50;
              if (higherIsBetter) {
                const total = Math.abs(vA) + Math.abs(vB);
                if (total > 0) {
                  ratioA = (Math.abs(vA) / total) * 100;
                  ratioB = (Math.abs(vB) / total) * 100;
                }
              } else {
                // Lower is better (e.g. Goals Conceded / 90)
                const invA = 1 / Math.max(0.01, Math.abs(vA));
                const invB = 1 / Math.max(0.01, Math.abs(vB));
                const invTotal = invA + invB;
                ratioA = (invA / invTotal) * 100;
                ratioB = (invB / invTotal) * 100;
              }

              const textA =
                battle.valA !== null && battle.valA !== undefined && !isNaN(battle.valA)
                  ? `${formatNumber(battle.valA)}${battle.isPercentage ? '%' : ''}`
                  : '—';
              const textB =
                battle.valB !== null && battle.valB !== undefined && !isNaN(battle.valB)
                  ? `${formatNumber(battle.valB)}${battle.isPercentage ? '%' : ''}`
                  : '—';

              return (
                <div
                  key={battle.label}
                  style={{
                    background: 'rgba(248, 250, 252, 0.8)',
                    border: '1px solid rgba(226, 232, 240, 0.7)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left Player A Score (w-12 text-center text-sm) */}
                  <div
                    style={{
                      width: '48px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: isWinnerA ? 900 : (isWinnerB ? 500 : 700),
                      color: isWinnerA ? '#0f172a' : (isWinnerB ? '#94a3b8' : '#475569'),
                      flexShrink: 0,
                    }}
                  >
                    {textA}
                  </div>

                  {/* Center Metric & Dual Bar: flex-1 flex flex-col items-center gap-1.5 */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {/* Metric Name */}
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#64748b',
                        textAlign: 'center',
                      }}
                    >
                      {battle.label}
                    </div>

                    {/* Dual-bar: h-2 w-[90%] bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80 */}
                    <div
                      style={{
                        height: '8px',
                        width: '90%',
                        background: '#f1f5f9',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* Left Half (Blue) */}
                      <div
                        style={{
                          width: `${ratioA}%`,
                          height: '100%',
                          background: '#2563eb',
                          transition: 'width 0.4s ease',
                        }}
                      />

                      {/* Right Half (Amber) */}
                      <div
                        style={{
                          width: `${ratioB}%`,
                          height: '100%',
                          background: '#f59e0b',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Player B Score (w-12 text-center text-sm) */}
                  <div
                    style={{
                      width: '48px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: isWinnerB ? 900 : (isWinnerA ? 500 : 700),
                      color: isWinnerB ? '#0f172a' : (isWinnerA ? '#94a3b8' : '#475569'),
                      flexShrink: 0,
                    }}
                  >
                    {textB}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. DETAILED STATISTICAL COMPARISON (Category-Themed Modular Cards) */}
      <div style={{ marginBottom: '32px' }}>
        {/* Sticky Master Comparison Header (Appears Once Only) */}
        <div
          style={{
            position: 'sticky',
            top: '16px',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '20px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
            border: '1px solid #1e293b',
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            alignItems: 'center',
          }}
        >
          {/* Left: Player A */}
          <div
            style={{
              gridColumn: 'span 3 / span 3',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#60a5fa',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nameA}
          </div>

          {/* Center: Title */}
          <div
            style={{
              gridColumn: 'span 6 / span 6',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#94a3b8',
            }}
          >
            STATISTICAL COMPARISON
          </div>

          {/* Right: Player B */}
          <div
            style={{
              gridColumn: 'span 3 / span 3',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#fbbf24',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nameB}
          </div>
        </div>

        {/* Category Modules */}
        {activeMetricSections.map((section) => (
          <div
            key={section.title}
            style={{
              background: '#ffffff',
              border: section.theme.border,
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            {/* Centered Category Header */}
            <div
              style={{
                padding: '10px 16px',
                background: 'rgba(248, 250, 252, 0.8)',
                borderBottom: section.theme.headerBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  background: section.theme.badgeBg,
                  color: section.theme.badgeText,
                  padding: '4px 16px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </span>
            </div>

            {/* Metric Rows */}
            <div>
              {section.metrics.map((metric, mIdx) => {
                const valA = metric.getValue(processedStatsA);
                const valB = metric.getValue(processedStatsB);
                const higherIsBetter = metric.higherIsBetter !== false;

                let isWinnerA = false;
                let isWinnerB = false;

                if (
                  valA !== null &&
                  valA !== undefined &&
                  valB !== null &&
                  valB !== undefined &&
                  !isNaN(valA) &&
                  !isNaN(valB)
                ) {
                  if (valA !== valB) {
                    if (higherIsBetter) {
                      isWinnerA = valA > valB;
                      isWinnerB = valB > valA;
                    } else {
                      isWinnerA = valA < valB;
                      isWinnerB = valB < valA;
                    }
                  }
                }

                const textA =
                  valA !== null && valA !== undefined && !isNaN(valA)
                    ? `${formatNumber(valA)}${metric.isPercentage ? '%' : ''}`
                    : '—';
                const textB =
                  valB !== null && valB !== undefined && !isNaN(valB)
                    ? `${formatNumber(valB)}${metric.isPercentage ? '%' : ''}`
                    : '—';

                return (
                  <div
                    key={metric.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                      alignItems: 'center',
                      padding: '10px 24px',
                      borderBottom: mIdx === section.metrics.length - 1 ? 'none' : '1px solid #f1f5f9',
                      background: '#ffffff',
                      transition: 'background 0.15s ease',
                    }}
                    className="scout-b2b-table-row"
                  >
                    {/* Player A Value (col-span-3 text-center) */}
                    <div
                      style={{
                        gridColumn: 'span 3 / span 3',
                        textAlign: 'center',
                      }}
                    >
                      {isWinnerA ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            background: section.theme.winnerBg,
                            color: section.theme.winnerColor,
                            border: section.theme.winnerBorder || 'none',
                            fontSize: '12px',
                            fontWeight: 900,
                          }}
                        >
                          {textA}
                        </span>
                      ) : isWinnerB ? (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#94a3b8',
                          }}
                        >
                          {textA}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                          }}
                        >
                          {textA}
                        </span>
                      )}
                    </div>

                    {/* Metric Name (col-span-6 text-center) */}
                    <div
                      style={{
                        gridColumn: 'span 6 / span 6',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#334155',
                      }}
                    >
                      {metric.label}
                    </div>

                    {/* Player B Value (col-span-3 text-center) */}
                    <div
                      style={{
                        gridColumn: 'span 3 / span 3',
                        textAlign: 'center',
                      }}
                    >
                      {isWinnerB ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            background: section.theme.winnerBg,
                            color: section.theme.winnerColor,
                            border: section.theme.winnerBorder || 'none',
                            fontSize: '12px',
                            fontWeight: 900,
                          }}
                        >
                          {textB}
                        </span>
                      ) : isWinnerA ? (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#94a3b8',
                          }}
                        >
                          {textB}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                          }}
                        >
                          {textB}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-800 animate-slideUp">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Shortlist Modal */}
      <AddToShortlistModal
        isOpen={!!shortlistTargetPlayer}
        onClose={() => setShortlistTargetPlayer(null)}
        player={shortlistTargetPlayer}
        onSuccess={(shortlistName) => {
          setToastMessage(`Added ${shortlistTargetPlayer?.fullName || shortlistTargetPlayer?.name} to "${shortlistName}"`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    </div>
  );
};
