import { useState, useEffect, useMemo } from 'react';
import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
  ComparisonScopeType,
} from '../../../types/player.types';
import { getPlayerByIdApi, getPlayerSeasonStatisticsApi } from '../../../services/player.service';
import {
  getRadarMetrics,
  getRadarProfile,
  getRadarProfileTitle,
  type RadarMetric,
} from '../../../utils/radar.utils';
import {
  type AggregatedStats,
  type MetricSection,
  OUTFIELD_METRIC_SECTIONS,
  GOALKEEPER_METRIC_SECTIONS,
  getPlayerPositionCodes,
  extractAggregatedStats,
} from './comparison.utils';

export interface KeyBattleItem {
  label: string;
  valA: number | null | undefined;
  valB: number | null | undefined;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

export interface UsePlayerComparisonResult {
  playerA: PlayerDetail | null;
  playerB: PlayerDetail | null;
  statsA: PlayerSeasonStatisticItem[];
  statsB: PlayerSeasonStatisticItem[];
  processedStatsA: AggregatedStats | null;
  processedStatsB: AggregatedStats | null;
  loading: boolean;
  error: string | null;

  selectedComparisonPosition: string;
  setSelectedComparisonPosition: (pos: string) => void;
  commonPositions: string[];

  radarMetricsA: RadarMetric[];
  radarMetricsB: RadarMetric[];
  radarProfileTitle: string;
  radarProfileTitleB: string | undefined;

  contextLabel: string;
  isGoalkeeperComparison: boolean;
  activeMetricSections: MetricSection[];
  keyBattles: KeyBattleItem[];
}

export function usePlayerComparison(
  playerAId: string,
  playerBId: string,
  scope: ComparisonScopeType,
  seasonId: string,
  competitionId?: string,
): UsePlayerComparisonResult {
  const [playerA, setPlayerA] = useState<PlayerDetail | null>(null);
  const [playerB, setPlayerB] = useState<PlayerDetail | null>(null);
  const [statsA, setStatsA] = useState<PlayerSeasonStatisticItem[]>([]);
  const [statsB, setStatsB] = useState<PlayerSeasonStatisticItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedComparisonPosition, setSelectedComparisonPosition] = useState<string>('CM');

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

  // Data Fetching
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

  const processedStatsA = useMemo(
    () => extractAggregatedStats(statsA, scope, seasonId, competitionId, statsA, statsB),
    [statsA, scope, seasonId, competitionId, statsB],
  );

  const processedStatsB = useMemo(
    () => extractAggregatedStats(statsB, scope, seasonId, competitionId, statsA, statsB),
    [statsB, scope, seasonId, competitionId, statsA],
  );

  // Radar Profiles
  const posA =
    selectedComparisonPosition ||
    (commonPositions.length > 0
      ? commonPositions[0]
      : playerA?.primaryPosition?.trim().toUpperCase() || 'CM');
  const posB =
    selectedComparisonPosition ||
    (commonPositions.length > 0
      ? commonPositions[0]
      : playerB?.primaryPosition?.trim().toUpperCase() || 'CM');

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

  // Goalkeeper Comparison mode
  const isGoalkeeperComparison =
    playerA?.primaryPosition?.trim().toUpperCase() === 'GK' &&
    playerB?.primaryPosition?.trim().toUpperCase() === 'GK';

  const activeMetricSections = isGoalkeeperComparison
    ? GOALKEEPER_METRIC_SECTIONS
    : OUTFIELD_METRIC_SECTIONS;

  // Key Battles Selection
  const keyBattles: KeyBattleItem[] = useMemo(() => {
    if (isGoalkeeperComparison) {
      return [
        { label: 'SAVE %', valA: processedStatsA?.savePercentage, valB: processedStatsB?.savePercentage, isPercentage: true, higherIsBetter: true },
        { label: 'CLEAN SHEET %', valA: processedStatsA?.cleanSheetPercentage, valB: processedStatsB?.cleanSheetPercentage, isPercentage: true, higherIsBetter: true },
        { label: 'SAVES / 90', valA: processedStatsA?.savesPer90, valB: processedStatsB?.savesPer90, higherIsBetter: true },
        { label: 'GOALS CONCEDED / 90', valA: processedStatsA?.goalsConcededPer90, valB: processedStatsB?.goalsConcededPer90, higherIsBetter: false },
        { label: 'PASS ACCURACY', valA: processedStatsA?.passAccuracy, valB: processedStatsB?.passAccuracy, isPercentage: true, higherIsBetter: true },
        { label: 'PENALTIES SAVED', valA: processedStatsA?.penaltiesSaved, valB: processedStatsB?.penaltiesSaved, higherIsBetter: true },
      ];
    }
    return [
      { label: 'GOALS', valA: processedStatsA?.goals, valB: processedStatsB?.goals, higherIsBetter: true },
      { label: 'ASSISTS', valA: processedStatsA?.assists, valB: processedStatsB?.assists, higherIsBetter: true },
      { label: 'GOAL CONVERSION', valA: processedStatsA?.goalConversion, valB: processedStatsB?.goalConversion, isPercentage: true, higherIsBetter: true },
      { label: 'KEY PASSES', valA: processedStatsA?.keyPasses, valB: processedStatsB?.keyPasses, higherIsBetter: true },
      { label: 'PASS ACCURACY', valA: processedStatsA?.passAccuracy, valB: processedStatsB?.passAccuracy, isPercentage: true, higherIsBetter: true },
      { label: 'BALL RECOVERIES', valA: processedStatsA?.recoveries, valB: processedStatsB?.recoveries, higherIsBetter: true },
    ];
  }, [isGoalkeeperComparison, processedStatsA, processedStatsB]);

  return {
    playerA,
    playerB,
    statsA,
    statsB,
    processedStatsA,
    processedStatsB,
    loading,
    error,
    selectedComparisonPosition,
    setSelectedComparisonPosition,
    commonPositions,
    radarMetricsA,
    radarMetricsB,
    radarProfileTitle,
    radarProfileTitleB,
    contextLabel,
    isGoalkeeperComparison,
    activeMetricSections,
    keyBattles,
  };
}
