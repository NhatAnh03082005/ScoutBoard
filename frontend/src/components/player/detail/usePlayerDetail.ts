import { useState, useEffect, useMemo, useRef } from "react";
import type {
  PlayerDetail,
  PlayerTeamHistoryItem,
  PlayerSeasonStatisticItem,
  PlayerMatchStatisticItem,
} from "../../../types/player.types";
import {
  getPlayerByIdApi,
  getPlayerTeamHistoryApi,
  getPlayerSeasonStatisticsApi,
  getPlayerMatchStatisticsApi,
} from "../../../services/player.service";

export interface UsePlayerDetailResult {
  player: PlayerDetail | null;
  loading: boolean;
  error: string | null;

  // Career History
  teamHistory: PlayerTeamHistoryItem[];
  loadingHistory: boolean;
  historyError: string | null;

  // Season Statistics
  seasonStatistics: PlayerSeasonStatisticItem[];
  statsLoading: boolean;
  statsError: string | null;

  // Selectors State & Derived Options
  selectedSeasonCode: string;
  setSelectedSeasonCode: (code: string) => void;
  availableSeasons: Array<{ seasonCode: string; isCurrent: boolean }>;

  selectedCompetitionId: string;
  setSelectedCompetitionId: (id: string) => void;
  availableCompetitions: Array<{ id: string; name: string; country: string | null }>;

  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;
  availableTeams: Array<{ id: string; name: string }>;

  selectedStatistic: PlayerSeasonStatisticItem | null;

  // Match Statistics (Match Log)
  matchStatistics: PlayerMatchStatisticItem[];
  matchLoading: boolean;
  matchError: string | null;
  matchOffset: number;
  setMatchOffset: React.Dispatch<React.SetStateAction<number>>;
  matchTotal: number;
  matchLimit: number;
}

export function usePlayerDetail(playerId: string): UsePlayerDetailResult {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Career History state
  const [teamHistory, setTeamHistory] = useState<PlayerTeamHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Season Statistics state
  const [seasonStatistics, setSeasonStatistics] = useState<PlayerSeasonStatisticItem[]>([]);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Selectors State (Grouped by Season Code)
  const [selectedSeasonCode, setSelectedSeasonCode] = useState<string>("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Match Statistics (Match Log) state
  const [matchStatistics, setMatchStatistics] = useState<PlayerMatchStatisticItem[]>([]);
  const [matchLoading, setMatchLoading] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchOffset, setMatchOffset] = useState<number>(0);
  const [matchTotal, setMatchTotal] = useState<number>(0);
  const matchLimit = 10;

  // Request race guard counter
  const latestMatchRequestIdRef = useRef<number>(0);

  // 1. Fetch Player Profile, Career History, and Season Statistics
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setLoadingHistory(true);
    setHistoryError(null);
    setStatsLoading(true);
    setStatsError(null);

    // Fetch Player Profile
    getPlayerByIdApi(playerId)
      .then((data) => {
        if (isMounted) {
          setPlayer(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Unable to load player details.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    // Fetch Player Career Team History
    getPlayerTeamHistoryApi(playerId)
      .then((hist) => {
        if (isMounted) {
          setTeamHistory(hist);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setHistoryError(err.message || "Unable to load player career history.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
        }
      });

    // Fetch Player Season Statistics
    getPlayerSeasonStatisticsApi(playerId)
      .then((stats) => {
        if (isMounted) {
          setSeasonStatistics(stats);

          if (stats.length > 0) {
            const currentSeasonStat = stats.find((s) => s.season.isCurrent);
            const defaultSeasonCode = currentSeasonStat
              ? currentSeasonStat.season.seasonCode || "N/A"
              : stats[0].season.seasonCode || "N/A";
            setSelectedSeasonCode(defaultSeasonCode);
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setStatsError(err.message || "Unable to load player season statistics.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setStatsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [playerId]);

  // Derived: Available Seasons list grouped by seasonCode
  const availableSeasons = useMemo(() => {
    const map = new Map<string, { seasonCode: string; isCurrent: boolean }>();
    seasonStatistics.forEach((stat) => {
      const code = stat.season.seasonCode || "N/A";
      if (!map.has(code)) {
        map.set(code, {
          seasonCode: code,
          isCurrent: stat.season.isCurrent,
        });
      }
    });
    return Array.from(map.values());
  }, [seasonStatistics]);

  // Derived: Available Competitions for the selected season code
  const availableCompetitions = useMemo(() => {
    if (!selectedSeasonCode) return [];
    const map = new Map<string, { id: string; name: string; country: string | null }>();
    seasonStatistics
      .filter((s) => (s.season.seasonCode || "N/A") === selectedSeasonCode)
      .forEach((s) => {
        if (!map.has(s.competition.id)) {
          map.set(s.competition.id, s.competition);
        }
      });
    return Array.from(map.values());
  }, [seasonStatistics, selectedSeasonCode]);

  // Auto-select valid competition
  useEffect(() => {
    if (availableCompetitions.length > 0) {
      const isValid = availableCompetitions.some((c) => c.id === selectedCompetitionId);
      if (!isValid) {
        setSelectedCompetitionId(availableCompetitions[0].id);
      }
    } else {
      setSelectedCompetitionId("");
    }
  }, [selectedSeasonCode, availableCompetitions, selectedCompetitionId]);

  // Derived: Matching records for selected Season Code + Competition
  const matchingRecords = useMemo(() => {
    if (!selectedSeasonCode || !selectedCompetitionId) return [];
    return seasonStatistics.filter(
      (s) =>
        (s.season.seasonCode || "N/A") === selectedSeasonCode &&
        s.competition.id === selectedCompetitionId,
    );
  }, [seasonStatistics, selectedSeasonCode, selectedCompetitionId]);

  // Derived: Available Teams
  const availableTeams = useMemo(() => {
    if (matchingRecords.length <= 1) return [];
    const map = new Map<string, { id: string; name: string }>();
    matchingRecords.forEach((r) => {
      if (r.team && !map.has(r.team.id)) {
        map.set(r.team.id, { id: r.team.id, name: r.team.name });
      }
    });
    return Array.from(map.values());
  }, [matchingRecords]);

  // Auto-select team
  useEffect(() => {
    if (availableTeams.length > 0) {
      const isValid = availableTeams.some((t) => t.id === selectedTeamId);
      if (!isValid) {
        setSelectedTeamId(availableTeams[0].id);
      }
    } else {
      setSelectedTeamId("");
    }
  }, [availableTeams, selectedTeamId]);

  // Reset match log pagination offset to 0 whenever context changes
  useEffect(() => {
    setMatchOffset(0);
  }, [selectedSeasonCode, selectedCompetitionId, selectedTeamId]);

  // Final Selected Statistic Record
  const selectedStatistic = useMemo<PlayerSeasonStatisticItem | null>(() => {
    if (matchingRecords.length === 0) return null;
    if (matchingRecords.length === 1) return matchingRecords[0];
    const match = matchingRecords.find((r) => r.team?.id === selectedTeamId);
    return match || matchingRecords[0];
  }, [matchingRecords, selectedTeamId]);

  // Fetch Match Statistics (Filtered strictly by selected Season & Competition)
  useEffect(() => {
    if (!playerId) return;
    if (statsLoading) return;

    // If player has season statistics, wait until context (season & competition) is ready
    if (seasonStatistics.length > 0 && (!selectedStatistic || !selectedCompetitionId)) {
      return;
    }

    const requestId = ++latestMatchRequestIdRef.current;
    setMatchLoading(true);
    setMatchError(null);

    const seasonId = selectedStatistic ? selectedStatistic.season.id : undefined;
    const competitionId = selectedCompetitionId || undefined;
    const teamId = selectedTeamId || undefined;

    getPlayerMatchStatisticsApi(playerId, {
      seasonId,
      competitionId,
      teamId,
      limit: matchLimit,
      offset: matchOffset,
    })
      .then((res) => {
        if (requestId === latestMatchRequestIdRef.current && res) {
          setMatchStatistics(res.items);
          setMatchTotal(res.pagination ? res.pagination.total : res.items.length);
        }
      })
      .catch((err: any) => {
        if (requestId === latestMatchRequestIdRef.current) {
          setMatchError(err.message || "Unable to load player match log.");
        }
      })
      .finally(() => {
        if (requestId === latestMatchRequestIdRef.current) {
          setMatchLoading(false);
        }
      });
  }, [
    playerId,
    statsLoading,
    seasonStatistics.length,
    selectedStatistic,
    selectedCompetitionId,
    selectedTeamId,
    matchOffset,
  ]);

  return {
    player,
    loading,
    error,
    teamHistory,
    loadingHistory,
    historyError,
    seasonStatistics,
    statsLoading,
    statsError,
    selectedSeasonCode,
    setSelectedSeasonCode,
    availableSeasons,
    selectedCompetitionId,
    setSelectedCompetitionId,
    availableCompetitions,
    selectedTeamId,
    setSelectedTeamId,
    availableTeams,
    selectedStatistic,
    matchStatistics,
    matchLoading,
    matchError,
    matchOffset,
    setMatchOffset,
    matchTotal,
    matchLimit,
  };
}
