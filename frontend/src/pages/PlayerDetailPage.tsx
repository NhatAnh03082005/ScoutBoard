import React, { useState, useEffect, useMemo, useRef } from "react";
import type {
  PlayerDetail,
  PlayerTeamHistoryItem,
  PlayerSeasonStatisticItem,
  PlayerMatchStatisticItem,
} from "../types/player.types";
import {
  getPlayerByIdApi,
  getPlayerTeamHistoryApi,
  getPlayerSeasonStatisticsApi,
  getPlayerMatchStatisticsApi,
} from "../services/player.service";
import { getPositionRoleInfo, getPositionCategory } from "../utils/position.utils";
import { PlayerRadarChart } from "../components/player/PlayerRadarChart";
import { getRadarMetrics } from "../utils/radar.utils";

interface PlayerDetailPageProps {
  playerId: string;
  onBack: () => void;
  onCompare?: (
    player: PlayerDetail,
    seasonStatistics: PlayerSeasonStatisticItem[],
  ) => void;
}

export const PlayerDetailPage: React.FC<PlayerDetailPageProps> = ({
  playerId,
  onBack,
  onCompare,
}) => {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Career History state
  const [teamHistory, setTeamHistory] = useState<PlayerTeamHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Season Statistics state
  const [seasonStatistics, setSeasonStatistics] = useState<
    PlayerSeasonStatisticItem[]
  >([]);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Selectors State (Grouped by Season Code)
  const [selectedSeasonCode, setSelectedSeasonCode] = useState<string>("");
  const [selectedCompetitionId, setSelectedCompetitionId] =
    useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Match Statistics (Match Log) state
  const [matchStatistics, setMatchStatistics] = useState<
    PlayerMatchStatisticItem[]
  >([]);
  const [matchLoading, setMatchLoading] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchOffset, setMatchOffset] = useState<number>(0);
  const [matchTotal, setMatchTotal] = useState<number>(0);
  const matchLimit = 10;

  // Request race guard counter
  const latestMatchRequestIdRef = useRef<number>(0);



  // Helper to format full name into dramatic sports title
  const formatSportsName = (fullName: string) => {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: "", lastName: parts[0] };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");
    return { firstName, lastName };
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setLoadingHistory(true);
    setHistoryError(null);
    setStatsLoading(true);
    setStatsError(null);

    // 1. Fetch Player Profile
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

    // 2. Fetch Player Career Team History
    getPlayerTeamHistoryApi(playerId)
      .then((hist) => {
        if (isMounted) {
          setTeamHistory(hist);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setHistoryError(
            err.message || "Unable to load player career history.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHistory(false);
        }
      });

    // 3. Fetch Player Season Statistics
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
          setStatsError(
            err.message || "Unable to load player season statistics.",
          );
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
    const map = new Map<
      string,
      { id: string; name: string; country: string | null }
    >();
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
      const isValid = availableCompetitions.some(
        (c) => c.id === selectedCompetitionId,
      );
      if (!isValid) {
        setSelectedCompetitionId(availableCompetitions[0].id);
      }
    } else {
      setSelectedCompetitionId("");
    }
  }, [selectedSeasonCode, availableCompetitions]);

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
  }, [availableTeams]);

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
    if (
      seasonStatistics.length > 0 &&
      (!selectedStatistic || !selectedCompetitionId)
    ) {
      return;
    }

    const requestId = ++latestMatchRequestIdRef.current;
    setMatchLoading(true);
    setMatchError(null);

    const seasonId = selectedStatistic
      ? selectedStatistic.season.id
      : undefined;
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
          setMatchTotal(
            res.pagination ? res.pagination.total : res.items.length,
          );
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

  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return "—";
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age}`;
  };

  const formatPer90 = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return val.toFixed(2);
  };

  const isGoalkeeper = player?.primaryPosition === "GK";
  const positionRole = getPositionRoleInfo(player?.primaryPosition);
  const positionCategory = getPositionCategory(player?.primaryPosition);

  // Position-aware KPI statistics for Hero Banner (2 dynamic role stats)
  const heroRoleStats: [
    { label: string; value: string | number; valClass: string },
    { label: string; value: string | number; valClass: string },
  ] = useMemo(() => {
    if (positionCategory === "GK") {
      return [
        {
          label: "SAVES",
          value: selectedStatistic ? (selectedStatistic.saves ?? 0) : "—",
          valClass: "val-saves",
        },
        {
          label: "CLEAN SHEETS",
          value: selectedStatistic ? (selectedStatistic.cleanSheets ?? 0) : "—",
          valClass: "val-cleansheets",
        },
      ];
    }

    if (positionCategory === "DEF") {
      return [
        {
          label: "TACKLES",
          value: selectedStatistic ? (selectedStatistic.tackles ?? 0) : "—",
          valClass: "val-tackles",
        },
        {
          label: "INTERCEPTIONS",
          value: selectedStatistic ? (selectedStatistic.interceptions ?? 0) : "—",
          valClass: "val-interceptions",
        },
      ];
    }

    // MID, ATT, and Safe Fallback (Goals & Assists)
    return [
      {
        label: "GOALS",
        value: selectedStatistic ? selectedStatistic.goals : "—",
        valClass: "val-goals",
      },
      {
        label: "ASSISTS",
        value: selectedStatistic ? selectedStatistic.assists : "—",
        valClass: "val-assists",
      },
    ];
  }, [positionCategory, selectedStatistic]);

  // Position-aware Radar Chart metrics
  const radarMetrics = useMemo(() => {
    return getRadarMetrics(positionCategory, selectedStatistic);
  }, [positionCategory, selectedStatistic]);

  // Helper: Determine Match Outcome & Opponent Info
  const getMatchContext = (item: PlayerMatchStatisticItem) => {
    const { match, team } = item;
    const isHome = team ? team.id === match.homeTeam.id : true;
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const venuePrefix = isHome ? "vs" : "@";

    let result: "WIN" | "DRAW" | "LOSS" | null = null;
    let scoreText = "—";

    if (
      match.homeScore !== null &&
      match.awayScore !== null &&
      !isNaN(match.homeScore) &&
      !isNaN(match.awayScore)
    ) {
      scoreText = `${match.homeScore} - ${match.awayScore}`;
      if (match.homeScore === match.awayScore) {
        result = "DRAW";
      } else if (isHome) {
        result = match.homeScore > match.awayScore ? "WIN" : "LOSS";
      } else {
        result = match.awayScore > match.homeScore ? "WIN" : "LOSS";
      }
    }

    return {
      isHome,
      opponent,
      venuePrefix,
      result,
      scoreText,
    };
  };

  const playerName = player ? player.fullName || player.name : "";
  const { firstName, lastName } = formatSportsName(playerName);
  const currentPage = Math.floor(matchOffset / matchLimit) + 1;
  const totalPages = Math.ceil(matchTotal / matchLimit) || 1;

  return (
    <div className="scout-b2b-page-container">
      {/* Top Header Navigation Bar */}
      <div className="scout-sports-topbar">
        <button
          type="button"
          className="scout-sports-back-btn"
          onClick={onBack}
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
          <span>Back to Player Search</span>
        </button>

        {player && onCompare && (
          <button
            type="button"
            className="scout-sports-compare-btn"
            onClick={() => onCompare(player, seasonStatistics)}
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
              <path d="M16 3h5v5" />
              <path d="M4 20L21 3" />
              <path d="M21 16v5h-5" />
              <path d="M15 15l6 6" />
              <path d="M4 4l5 5" />
            </svg>
            <span>Compare Player</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="scout-b2b-alert-error" style={{ marginBottom: "20px" }}>
          <span>❌</span>
          <span>{error}</span>
          <button
            type="button"
            className="scout-b2b-btn scout-b2b-btn-secondary"
            style={{ marginLeft: "auto", height: "32px", padding: "0 12px" }}
            onClick={onBack}
          >
            Return to Search
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          className="scout-fc-hero-banner"
          style={{
            minHeight: "380px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#94a3b8" }}>
            <div className="scout-loading-spinner" />
            <div
              style={{
                marginTop: "12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#cbd5e1",
              }}
            >
              Loading professional player profile...
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      {!loading && !error && player && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* =========================================================================
              1. PLAYER HERO CARD
             ========================================================================= */}
          <div className="scout-fc-hero-banner" style={{ overflow: "hidden" }}>
            {/* Ambient Sports Geometry Glow */}
            <div className="scout-fc-hero-ambient" />
            <div className="scout-fc-hero-grid-pattern" />

            <div className="scout-hero-12col-grid">
              {/* Left Column (The Player Card/Image - 3 cols) */}
              <div className="scout-hero-col-left">
                <div className="scout-fc-card-frame">
                  {player.imageUrl ? (
                    <img
                      src={player.imageUrl}
                      alt={playerName}
                      className="scout-fc-player-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (
                            e.currentTarget.nextElementSibling as HTMLElement
                          ).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}

                  {/* Facebook-style Default Silhouette Avatar Fallback */}
                  <div
                    className="scout-fc-player-card-fallback"
                    style={{ display: player.imageUrl ? "none" : "flex" }}
                  >
                    <svg
                      viewBox="0 0 200 260"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      preserveAspectRatio="xMidYMid slice"
                      style={{ width: "100%", height: "100%", borderRadius: "18px" }}
                    >
                      <rect width="200" height="260" fill="#eff6ff" />
                      <circle cx="100" cy="130" r="110" fill="#dbeafe" fillOpacity="0.5" />
                      <circle cx="100" cy="85" r="36" fill="#94a3b8" />
                      <path
                        d="M32 205C32 155 62 130 100 130C138 130 168 155 168 205V260H32V205Z"
                        fill="#94a3b8"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Column (Identity & Stats - 9 cols) */}
              <div className="scout-hero-col-right">
                {/* Top line: Club & Nation */}
                <div className="scout-fc-club-nation">
                  <span>
                    {player.currentTeam
                      ? player.currentTeam.name
                      : "Free Agent"}
                  </span>
                  <span className="scout-fc-dot">•</span>
                  <span>{player.nationality || "International"}</span>
                  {player.shirtNumber && (
                    <>
                      <span className="scout-fc-dot">•</span>
                      <span style={{ color: "#fde047" }}>
                        #{player.shirtNumber}
                      </span>
                    </>
                  )}
                </div>

                {/* 1. Name & Position Row (Top Alignment) */}
                <div className="scout-hero-name-pos-row">
                  <h1 className="scout-hero-name-headline">
                    {firstName && (
                      <span className="scout-fc-name-first">{firstName} </span>
                    )}
                    <span className="scout-fc-name-last">{lastName}</span>
                  </h1>
                  <div
                    className={`scout-hero-pos-badge ${positionRole.cssClass}`}
                  >
                    {player.primaryPosition || "CM"}
                  </div>
                </div>

                {/* 2. Bio Attributes Sub-Row */}
                <div className="scout-hero-bio-row">
                  <span>{calculateAge(player.dateOfBirth)} YRS</span>
                  <span className="scout-hero-bio-dot">•</span>
                  <span>{player.heightCm ? `${player.heightCm} CM` : "—"}</span>
                  <span className="scout-hero-bio-dot">•</span>
                  <span>
                    {player.preferredFoot === "LEFT"
                      ? "LEFT FOOT"
                      : player.preferredFoot === "RIGHT"
                        ? "RIGHT FOOT"
                        : "BOTH FEET"}
                  </span>
                </div>

                {/* 5 REAL PERFORMANCE KPIS (5-Column Grid spanning full width) */}
                <div className="scout-hero-kpi-grid-5">
                  <div className="scout-hero-kpi-box">
                    <span className="scout-hero-kpi-val">
                      {selectedStatistic ? selectedStatistic.appearances : "—"}
                    </span>
                    <span className="scout-hero-kpi-lbl">APPS</span>
                  </div>

                  <div className="scout-hero-kpi-box">
                    <span className="scout-hero-kpi-val">
                      {selectedStatistic ? selectedStatistic.starts : "—"}
                    </span>
                    <span className="scout-hero-kpi-lbl">STARTS</span>
                  </div>

                  <div className="scout-hero-kpi-box">
                    <span className="scout-hero-kpi-val">
                      {selectedStatistic
                        ? `${selectedStatistic.minutesPlayed.toLocaleString()}'`
                        : "—"}
                    </span>
                    <span className="scout-hero-kpi-lbl">MINS</span>
                  </div>

                  <div className="scout-hero-kpi-box">
                    <span className={`scout-hero-kpi-val ${heroRoleStats[0].valClass}`}>
                      {heroRoleStats[0].value}
                    </span>
                    <span className="scout-hero-kpi-lbl">{heroRoleStats[0].label}</span>
                  </div>

                  <div className="scout-hero-kpi-box">
                    <span className={`scout-hero-kpi-val ${heroRoleStats[1].valClass}`}>
                      {heroRoleStats[1].value}
                    </span>
                    <span className="scout-hero-kpi-lbl">{heroRoleStats[1].label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. PHYSICAL & BIO  |  CAREER HISTORY (2 Columns Desktop, Stacked Mobile)
             ========================================================================= */}
          <div className="scout-sports-split-grid">
            {/* Physical & Bio Card */}
            <div
              className="scout-b2b-control-card flex flex-col justify-between"
              style={{ margin: 0 }}
            >
              <div>
                <div className="scout-detail-section-title">Physical & Bio</div>

                <div
                  className="scout-sports-bio-list"
                  style={{ marginTop: "16px" }}
                >
                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">
                      Age / Date of Birth
                    </span>
                    <strong className="scout-sports-bio-val">
                      {player.dateOfBirth
                        ? `${calculateAge(player.dateOfBirth)} yrs (${new Date(player.dateOfBirth).toLocaleDateString()})`
                        : "—"}
                    </strong>
                  </div>

                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">Nationality</span>
                    <strong className="scout-sports-bio-val">
                      {player.nationality || "—"}
                    </strong>
                  </div>

                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">Height</span>
                    <strong className="scout-sports-bio-val">
                      {player.heightCm ? `${player.heightCm} cm` : "—"}
                    </strong>
                  </div>

                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">Weight</span>
                    <strong className="scout-sports-bio-val">
                      {player.weightKg ? `${player.weightKg} kg` : "—"}
                    </strong>
                  </div>

                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">Preferred Foot</span>
                    <strong className="scout-sports-bio-val">
                      {player.preferredFoot === "LEFT"
                        ? "Left"
                        : player.preferredFoot === "RIGHT"
                          ? "Right"
                          : player.preferredFoot === "BOTH"
                            ? "Both"
                            : player.preferredFoot || "—"}
                    </strong>
                  </div>

                  <div className="scout-sports-bio-row">
                    <span className="scout-sports-bio-key">Current Club</span>
                    <strong
                      className="scout-sports-bio-val"
                      style={{ color: "#0B4EA2" }}
                    >
                      {player.currentTeam
                        ? player.currentTeam.name
                        : "Free Agent"}
                    </strong>
                  </div>

                  <div
                    className="scout-sports-bio-row"
                    style={{ borderBottom: "none" }}
                  >
                    <span className="scout-sports-bio-key">Positions</span>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {player.positions && player.positions.length > 0 ? (
                        player.positions.map((pos) => {
                          const roleInfo = getPositionRoleInfo(pos.positionCode);
                          return (
                            <span
                              key={pos.id}
                              className={`scout-b2b-pos-badge ${roleInfo.badgeClass}`}
                              style={{
                                opacity: pos.isPrimary ? 1 : 0.75,
                                fontWeight: pos.isPrimary ? 700 : 600,
                              }}
                            >
                              {pos.positionCode}{" "}
                              {pos.isPrimary ? "(Primary)" : ""}
                            </span>
                          );
                        })
                      ) : (
                        <span className={`scout-b2b-pos-badge ${getPositionRoleInfo(player.primaryPosition).badgeClass}`}>
                          {player.primaryPosition || "—"} (Primary)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Career History Card (Flex Column with Fixed Height & Sleek Custom Scrollbar) */}
            <div
              className="scout-b2b-control-card flex flex-col h-[380px]"
              style={{ margin: 0 }}
            >
              <div className="scout-detail-section-title shrink-0">
                Career History
              </div>

              {loadingHistory && (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    fontStyle: "italic",
                    marginTop: "14px",
                  }}
                >
                  Loading career history...
                </div>
              )}

              {historyError && (
                <div
                  className="scout-b2b-alert-error"
                  style={{ fontSize: "13px", marginTop: "14px" }}
                >
                  ⚠️ {historyError}
                </div>
              )}

              {!loadingHistory && !historyError && teamHistory.length === 0 && (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    fontStyle: "italic",
                    marginTop: "14px",
                  }}
                >
                  No career history recorded for this player.
                </div>
              )}

              {!loadingHistory && !historyError && teamHistory.length > 0 && (
                <div className="flex-1 overflow-y-auto pr-3 mt-2 scout-custom-scrollbar">
                  <div
                    className="scout-sports-timeline"
                    style={{ marginTop: "12px" }}
                  >
                    {teamHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`scout-sports-timeline-item ${item.isCurrent ? "current" : ""}`}
                      >
                        <div className="scout-sports-timeline-dot" />
                        <div className="scout-sports-timeline-content">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#0f172a",
                              }}
                            >
                              {item.team.name}
                            </div>
                            {item.isCurrent && (
                              <span
                                className="scout-b2b-badge-count"
                                style={{ fontSize: "10px", padding: "2px 6px" }}
                              >
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginTop: "4px",
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            <span>
                              {item.joinedAt
                                ? new Date(item.joinedAt).getFullYear()
                                : "—"}{" "}
                              —{" "}
                              {item.isCurrent
                                ? "Present"
                                : item.leftAt
                                  ? new Date(item.leftAt).getFullYear()
                                  : "—"}
                            </span>
                            {item.shirtNumber && (
                              <span className="scout-detail-shirt-badge">
                                #{item.shirtNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              3. PLAYER PERFORMANCE (30/70 Vertical Split: Radar Left + Stats & Summaries Right)
             ========================================================================= */}
          <div className="scout-b2b-control-card" style={{ margin: 0 }}>
            {/* Header with Title + Context Selectors */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div className="scout-perf-header-title">
                  PLAYER PERFORMANCE
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  Standardized per-90 metrics & tactical output across campaigns
                </div>
              </div>

              {/* Season & Competition Selectors */}
              {seasonStatistics.length > 0 && (
                <div className="scout-sports-context-selectors">
                  <select
                    className="scout-b2b-select scout-sports-select"
                    value={selectedSeasonCode}
                    onChange={(e) => setSelectedSeasonCode(e.target.value)}
                    aria-label="Select Season"
                  >
                    {availableSeasons.map((s) => (
                      <option key={s.seasonCode} value={s.seasonCode}>
                        Season {s.seasonCode} {s.isCurrent ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>

                  <select
                    className="scout-b2b-select scout-sports-select"
                    value={selectedCompetitionId}
                    onChange={(e) => setSelectedCompetitionId(e.target.value)}
                    aria-label="Select Competition"
                  >
                    {availableCompetitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.country ? `(${c.country})` : ""}
                      </option>
                    ))}
                  </select>

                  {availableTeams.length > 1 && (
                    <select
                      className="scout-b2b-select scout-sports-select"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      aria-label="Select Team"
                    >
                      {availableTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {statsLoading && (
              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  fontStyle: "italic",
                  padding: "20px 0",
                }}
              >
                Loading performance metrics...
              </div>
            )}

            {statsError && (
              <div
                className="scout-b2b-alert-error"
                style={{ fontSize: "13px", margin: "14px 0" }}
              >
                ⚠️ {statsError}
              </div>
            )}

            {!statsLoading && selectedStatistic && (
              <div className="scout-fc-perf-grid-30-70">
                {/* Left Column - Radar Chart (30% - lg:col-span-4) */}
                <div className="scout-fc-radar-panel">
                  <PlayerRadarChart
                    metrics={radarMetrics}
                    positionLabel={player.primaryPosition || "Player"}
                    roleHexColor={positionRole.hexColor}
                  />
                </div>

                {/* Right Column - ScoutBoard Football Game Attribute Cards (70% - lg:col-span-8) */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {isGoalkeeper ? (
                    <>
                      {/* GOALKEEPING Card */}
                      <div className="scout-clean-stat-card card-blue">
                        <div className="scout-clean-card-header">
                          <div className="scout-clean-card-title title-blue">
                            <span>🧤</span> GOALKEEPING
                          </div>
                        </div>
                        <div className="scout-clean-grid-4">
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.savesPer90)}
                            </span>
                            <span className="scout-clean-lbl">SAVES / 90</span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(
                                selectedStatistic.goalsConcededPer90,
                              )}
                            </span>
                            <span className="scout-clean-lbl">
                              CONCEDED / 90
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {selectedStatistic.savePercentage !== null &&
                              selectedStatistic.savePercentage !== undefined
                                ? `${selectedStatistic.savePercentage}%`
                                : "—"}
                            </span>
                            <span className="scout-clean-lbl">SAVE %</span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {selectedStatistic.cleanSheetPercentage !==
                                null &&
                              selectedStatistic.cleanSheetPercentage !==
                                undefined
                                ? `${selectedStatistic.cleanSheetPercentage}%`
                                : "—"}
                            </span>
                            <span className="scout-clean-lbl">
                              CLEAN SHEET %
                            </span>
                          </div>
                        </div>

                        {/* Inline Footer (Raw Totals) */}
                        <div className="scout-clean-footer">
                          <div className="scout-clean-footer-item">
                            SAVES:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.saves ?? 0}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            CONCEDED:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.goalsConceded ?? 0}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            CLEAN SHEETS:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.cleanSheets ?? 0}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            PENS SAVED:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.penaltiesSaved ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DISTRIBUTION Card */}
                      <div className="scout-clean-stat-card card-emerald">
                        <div className="scout-clean-card-header">
                          <div className="scout-clean-card-title title-emerald">
                            <span>🎯</span> DISTRIBUTION
                          </div>
                        </div>
                        <div className="scout-clean-grid-2">
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {selectedStatistic.passAccuracy !== null &&
                              selectedStatistic.passAccuracy !== undefined
                                ? `${selectedStatistic.passAccuracy}%`
                                : "—"}
                            </span>
                            <span className="scout-clean-lbl">
                              PASS ACCURACY
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.passesPer90)}
                            </span>
                            <span className="scout-clean-lbl">PASSES / 90</span>
                          </div>
                        </div>

                        {/* Inline Footer (Raw Totals) */}
                        <div className="scout-clean-footer">
                          <div className="scout-clean-footer-item">
                            PASSES ATTEMPTED:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.passesAttempted}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            PASSES COMPLETED:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.passesCompleted}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* ATTACKING Card (Amber-500 Left Accent) */}
                      <div className="scout-clean-stat-card card-amber">
                        <div className="scout-clean-card-header">
                          <div className="scout-clean-card-title title-amber">
                            <span>⚽</span> ATTACKING
                          </div>
                        </div>
                        <div className="scout-clean-grid-3">
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.goalsPer90)}
                            </span>
                            <span className="scout-clean-lbl">GOALS / 90</span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.assistsPer90)}
                            </span>
                            <span className="scout-clean-lbl">
                              ASSISTS / 90
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.shotsPer90)}
                            </span>
                            <span className="scout-clean-lbl">SHOTS / 90</span>
                          </div>
                        </div>

                        {/* Inline Footer (Raw Totals) */}
                        <div className="scout-clean-footer">
                          <div className="scout-clean-footer-item">
                            GOALS:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.goals}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            ASSISTS:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.assists}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            SHOTS:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.shots}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            ON TARGET:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.shotsOnTarget}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PASSING Card (Blue-500 Left Accent) */}
                      <div className="scout-clean-stat-card card-blue">
                        <div className="scout-clean-card-header">
                          <div className="scout-clean-card-title title-blue">
                            <span>🎯</span> PASSING
                          </div>
                        </div>
                        <div className="scout-clean-grid-2">
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {selectedStatistic.passAccuracy !== null &&
                              selectedStatistic.passAccuracy !== undefined
                                ? `${selectedStatistic.passAccuracy}%`
                                : "—"}
                            </span>
                            <span className="scout-clean-lbl">
                              PASS ACCURACY
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.keyPassesPer90)}
                            </span>
                            <span className="scout-clean-lbl">
                              KEY PASSES / 90
                            </span>
                          </div>
                        </div>

                        {/* Inline Footer (Raw Totals) */}
                        <div className="scout-clean-footer">
                          <div className="scout-clean-footer-item">
                            KEY PASSES:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.keyPasses}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            PASSES (CMP / ATT):{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.passesCompleted} /{" "}
                              {selectedStatistic.passesAttempted}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DEFENDING Card (Emerald-500 Left Accent) */}
                      <div className="scout-clean-stat-card card-emerald">
                        <div className="scout-clean-card-header">
                          <div className="scout-clean-card-title title-emerald">
                            <span>🛡️</span> DEFENDING
                          </div>
                        </div>
                        <div className="scout-clean-grid-3">
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.tacklesPer90)}
                            </span>
                            <span className="scout-clean-lbl">
                              TACKLES / 90
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(
                                selectedStatistic.interceptionsPer90,
                              )}
                            </span>
                            <span className="scout-clean-lbl">
                              INTERCEPTIONS / 90
                            </span>
                          </div>
                          <div className="scout-clean-stat-block">
                            <span className="scout-clean-num">
                              {formatPer90(selectedStatistic.duelsWonPer90)}
                            </span>
                            <span className="scout-clean-lbl">
                              DUELS WON / 90
                            </span>
                          </div>
                        </div>

                        {/* Inline Footer (Raw Totals) */}
                        <div className="scout-clean-footer">
                          <div className="scout-clean-footer-item">
                            TACKLES:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.tackles}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            INTERCEPTIONS:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.interceptions}
                            </span>
                          </div>
                          <div className="scout-clean-footer-item">
                            DUELS WON:{" "}
                            <span className="scout-clean-footer-val">
                              {selectedStatistic.duelsWon}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              4. RECENT MATCH LOG TABLE
             ========================================================================= */}
          <div className="scout-b2b-control-card" style={{ margin: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <div className="scout-detail-section-title">
                  Recent Match Log
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  Individual match performances and official statistical ratings
                </div>
              </div>

              {/* Match Pagination Bar */}
              {!matchLoading && !matchError && matchTotal > 0 && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <button
                    type="button"
                    className="scout-b2b-btn scout-b2b-btn-secondary"
                    style={{
                      height: "32px",
                      padding: "0 10px",
                      fontSize: "12px",
                    }}
                    disabled={matchOffset === 0}
                    onClick={() =>
                      setMatchOffset((prev) => Math.max(0, prev - matchLimit))
                    }
                  >
                    ← Prev
                  </button>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="scout-b2b-btn scout-b2b-btn-secondary"
                    style={{
                      height: "32px",
                      padding: "0 10px",
                      fontSize: "12px",
                    }}
                    disabled={matchOffset + matchLimit >= matchTotal}
                    onClick={() => setMatchOffset((prev) => prev + matchLimit)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {matchLoading && (
              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  fontStyle: "italic",
                }}
              >
                Loading match log...
              </div>
            )}

            {matchError && (
              <div
                className="scout-b2b-alert-error"
                style={{ fontSize: "13px" }}
              >
                ⚠️ {matchError}
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length === 0 && (
              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  fontStyle: "italic",
                }}
              >
                No match statistics available for this season and competition.
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length > 0 && (
              <div
                className="scout-b2b-table-wrapper"
                style={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                }}
              >
                <table className="scout-b2b-table">
                  <thead>
                    {isGoalkeeper ? (
                      <tr>
                        <th>Date</th>
                        <th>Match / Opponent</th>
                        <th>Score</th>
                        <th>Result</th>
                        <th>Role</th>
                        <th>Mins</th>
                        <th>Rating</th>
                        <th>Saves</th>
                        <th>Conceded</th>
                        <th>Clean Sheet</th>
                        <th>Pens Saved</th>
                        <th>Pass (Cmp/Att)</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Date</th>
                        <th>Match / Opponent</th>
                        <th>Score</th>
                        <th>Result</th>
                        <th>Role</th>
                        <th>Mins</th>
                        <th>Rating</th>
                        <th>G</th>
                        <th>A</th>
                        <th>Shots</th>
                        <th>Pass (Cmp/Att)</th>
                        <th>KP</th>
                        <th>Tk</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {matchStatistics.map((item) => {
                      const ctx = getMatchContext(item);
                      const kickoffStr = item.match.kickoffAt
                        ? new Date(item.match.kickoffAt).toLocaleDateString()
                        : "—";

                      return (
                        <tr key={item.id} className="scout-b2b-table-row">
                          {/* Date */}
                          <td style={{ fontSize: "12px", color: "#64748b" }}>
                            {kickoffStr}
                          </td>

                          {/* Match / Opponent */}
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: ctx.isHome ? "#1d4ed8" : "#b45309",
                                  background: ctx.isHome
                                    ? "#eff6ff"
                                    : "#fef3c7",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  display: "inline-block",
                                }}
                              >
                                {ctx.venuePrefix}
                              </span>
                              <span
                                style={{ fontWeight: 600, color: "#0f172a" }}
                              >
                                {ctx.opponent
                                  ? ctx.opponent.shortName || ctx.opponent.name
                                  : "—"}
                              </span>
                            </div>
                          </td>

                          {/* Score */}
                          <td
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              fontSize: "13px",
                            }}
                          >
                            {ctx.scoreText}
                          </td>

                          {/* Result Badge */}
                          <td>
                            <span
                              style={{
                                background:
                                  ctx.result === "WIN"
                                    ? "#dcfce7"
                                    : ctx.result === "DRAW"
                                      ? "#fef3c7"
                                      : ctx.result === "LOSS"
                                        ? "#fee2e2"
                                        : "#f1f5f9",
                                color:
                                  ctx.result === "WIN"
                                    ? "#15803d"
                                    : ctx.result === "DRAW"
                                      ? "#b45309"
                                      : ctx.result === "LOSS"
                                        ? "#b91c1c"
                                        : "#64748b",
                                fontWeight: 800,
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                display: "inline-block",
                              }}
                            >
                              {ctx.result === "WIN"
                                ? "W"
                                : ctx.result === "DRAW"
                                  ? "D"
                                  : ctx.result === "LOSS"
                                    ? "L"
                                    : "—"}
                            </span>
                          </td>

                          {/* Role: XI / Sub */}
                          <td>
                            <span
                              className="scout-b2b-badge-count"
                              style={{
                                background: item.isStarter
                                  ? "#eff6ff"
                                  : "#f1f5f9",
                                color: item.isStarter ? "#1d4ed8" : "#64748b",
                                borderColor: item.isStarter
                                  ? "#bfdbfe"
                                  : "#e2e8f0",
                                fontSize: "11px",
                              }}
                            >
                              {item.isStarter ? "XI" : "Sub"}
                            </span>
                          </td>

                          {/* Minutes */}
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>
                            {item.minutesPlayed}'
                          </td>

                          {/* Rating */}
                          <td>
                            {item.rating !== null &&
                            item.rating !== undefined ? (
                              <span
                                style={{
                                  color: "#d97706",
                                  fontWeight: 700,
                                  fontSize: "13px",
                                }}
                              >
                                ⭐ {Number(item.rating).toFixed(1)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          {isGoalkeeper ? (
                            <>
                              {/* Saves */}
                              <td style={{ fontWeight: 700, color: "#0284c7" }}>
                                {item.saves !== null && item.saves !== undefined
                                  ? item.saves
                                  : "—"}
                              </td>

                              {/* Goals Conceded */}
                              <td
                                style={{
                                  fontWeight: 700,
                                  color:
                                    item.goalsConceded !== null &&
                                    item.goalsConceded !== undefined &&
                                    item.goalsConceded > 0
                                      ? "#b91c1c"
                                      : "#64748b",
                                }}
                              >
                                {item.goalsConceded !== null &&
                                item.goalsConceded !== undefined
                                  ? item.goalsConceded
                                  : "—"}
                              </td>

                              {/* Clean Sheet */}
                              <td>
                                {item.cleanSheets === 1 ? (
                                  <span
                                    style={{
                                      color: "#16a34a",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Yes
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>No</span>
                                )}
                              </td>

                              {/* Penalties Saved */}
                              <td style={{ fontWeight: 700, color: "#059669" }}>
                                {item.penaltiesSaved ?? 0}
                              </td>

                              {/* Pass (Cmp/Att) */}
                              <td style={{ fontSize: "12px", fontWeight: 600 }}>
                                {item.passesCompleted}/{item.passesAttempted}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Goals */}
                              <td
                                style={{
                                  fontWeight: 700,
                                  color: item.goals > 0 ? "#16a34a" : "#64748b",
                                }}
                              >
                                {item.goals}
                              </td>

                              {/* Assists */}
                              <td
                                style={{
                                  fontWeight: 700,
                                  color:
                                    item.assists > 0 ? "#2563eb" : "#64748b",
                                }}
                              >
                                {item.assists}
                              </td>

                              {/* Shots */}
                              <td>{item.shots}</td>

                              {/* Pass (Cmp/Att) */}
                              <td style={{ fontSize: "12px", fontWeight: 600 }}>
                                {item.passesCompleted}/{item.passesAttempted}
                              </td>

                              {/* Key Passes */}
                              <td>{item.keyPasses}</td>

                              {/* Tackles */}
                              <td>{item.tackles}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
