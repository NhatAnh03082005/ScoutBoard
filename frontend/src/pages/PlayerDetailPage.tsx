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
import { PerformanceCards } from "../components/player/PerformanceCards";
import { getRadarMetrics } from "../utils/radar.utils";
import { AddToShortlistModal } from "../components/shortlist/AddToShortlistModal";
import { getNationalityFlagUrl } from "../utils/nationality-flag.util";

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
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Position-aware Radar Chart metrics (7 Tactical Profiles)
  const radarMetrics = useMemo(() => {
    return getRadarMetrics(player?.primaryPosition, selectedStatistic);
  }, [player?.primaryPosition, selectedStatistic]);

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
  const flagUrl = player
    ? getNationalityFlagUrl(player.nationality, player.nationalityFlagUrl)
    : null;

  const heroBioItems: string[] = [];
  if (player) {
    if (player.dateOfBirth) {
      const age = calculateAge(player.dateOfBirth);
      if (age && age !== "—") heroBioItems.push(`${age} YRS`);
    }
    if (player.heightCm != null) {
      heroBioItems.push(`${player.heightCm} CM`);
    }
    if (player.weightKg != null) {
      heroBioItems.push(`${player.weightKg} KG`);
    }
  }

  const currentPage = Math.floor(matchOffset / matchLimit) + 1;
  const totalPages = Math.ceil(matchTotal / matchLimit) || 1;

  return (
    <div className="scout-b2b-page-container">
      {/* Top Header Navigation Bar with Breadcrumb Context & Action Hierarchy */}
      <div className="scout-sports-topbar">
        <div className="scout-detail-breadcrumb">
          <button
            type="button"
            className="scout-sports-back-btn"
            onClick={onBack}
            title="Return to Player Search"
            aria-label="Return to Player Search"
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
            <span>Search Results</span>
          </button>
          {player?.currentTeam && (
            <>
              <span style={{ color: 'var(--scout-border-default)', opacity: 0.6 }}>/</span>
              <span style={{ color: 'var(--scout-text-secondary)', fontSize: '12.5px' }}>
                {player.currentTeam.name}
              </span>
            </>
          )}
          {player && (
            <>
              <span style={{ color: 'var(--scout-border-default)', opacity: 0.6 }}>/</span>
              <span style={{ color: 'var(--scout-text-primary)', fontWeight: 700, fontSize: '13px' }}>
                {player.fullName}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Secondary Action: Add to Shortlist (Bookmark Style) */}
          {player && (
            <button
              type="button"
              className="scout-btn scout-btn-secondary"
              onClick={() => setIsShortlistModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60a5fa',
                background: 'rgba(37, 99, 235, 0.12)',
                fontWeight: 700,
              }}
              title="Save player to scouting watchlist"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>Add to Shortlist</span>
            </button>
          )}

          {/* Primary Action: Compare Player (Analytical Core Feature) */}
          {player && onCompare && (
            <button
              type="button"
              className="scout-btn scout-btn-primary"
              onClick={() => onCompare(player, seasonStatistics)}
              title="Open tactical comparison for this player"
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
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-800 animate-slideUp">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {player && (
        <AddToShortlistModal
          isOpen={isShortlistModalOpen}
          onClose={() => setIsShortlistModalOpen(false)}
          player={player}
          onSuccess={(shortlistName) => {
            setToastMessage(`Added ${player.fullName || player.name} to "${shortlistName}"`);
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}

      {/* Error Alert */}
      {error && (
        <div className="scout-b2b-alert-error" style={{ marginBottom: "20px" }}>
          <span>❌</span>
          <span>{error}</span>
          <button
            type="button"
            className="scout-btn scout-btn-sm scout-btn-secondary"
            style={{ marginLeft: "auto" }}
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
                <div className="scout-fc-club-nation" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {player.currentTeam && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {player.currentTeam.logoUrl && (
                        <img
                          src={player.currentTeam.logoUrl}
                          alt={player.currentTeam.name}
                          style={{ width: "18px", height: "18px", objectFit: "contain" }}
                        />
                      )}
                      <span>{player.currentTeam.name}</span>
                    </span>
                  )}
                  {player.currentTeam && player.nationality && (
                    <span className="scout-fc-dot">•</span>
                  )}
                  {player.nationality && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {flagUrl && (
                        <img
                          src={flagUrl}
                          alt={player.nationality}
                          style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }}
                        />
                      )}
                      <span>{player.nationality}</span>
                    </span>
                  )}
                  {player.shirtNumber != null && (
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

                {/* 2. Bio Attributes Sub-Row (Null Fields Completely Hidden) */}
                {heroBioItems.length > 0 && (
                  <div className="scout-hero-bio-row">
                    {heroBioItems.map((item, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className="scout-hero-bio-dot">•</span>}
                        <span>{item}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

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
                  {player.dateOfBirth && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">
                        Age / Date of Birth
                      </span>
                      <strong className="scout-sports-bio-val">
                        {calculateAge(player.dateOfBirth)} yrs ({new Date(player.dateOfBirth).toLocaleDateString()})
                      </strong>
                    </div>
                  )}

                  {player.nationality && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">Nationality</span>
                      <strong className="scout-sports-bio-val" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {flagUrl && (
                          <img
                            src={flagUrl}
                            alt={player.nationality}
                            style={{ width: "20px", height: "14px", objectFit: "cover", borderRadius: "2px" }}
                          />
                        )}
                        <span>{player.nationality}</span>
                      </strong>
                    </div>
                  )}

                  {player.heightCm != null && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">Height</span>
                      <strong className="scout-sports-bio-val">
                        {player.heightCm} cm
                      </strong>
                    </div>
                  )}

                  {player.weightKg != null && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">Weight</span>
                      <strong className="scout-sports-bio-val">
                        {player.weightKg} kg
                      </strong>
                    </div>
                  )}

                  {player.shirtNumber != null && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">Shirt Number</span>
                      <strong className="scout-sports-bio-val">
                        #{player.shirtNumber}
                      </strong>
                    </div>
                  )}

                  {player.currentTeam && (
                    <div className="scout-sports-bio-row">
                      <span className="scout-sports-bio-key">Current Club</span>
                      <strong
                        className="scout-sports-bio-val"
                        style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--scout-text-primary)" }}
                      >
                        {player.currentTeam.logoUrl && (
                          <img
                            src={player.currentTeam.logoUrl}
                            alt={player.currentTeam.name}
                            style={{ width: "20px", height: "20px", objectFit: "contain" }}
                          />
                        )}
                        <span>{player.currentTeam.name}</span>
                      </strong>
                    </div>
                  )}

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
                                color: "var(--scout-text-primary)",
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

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <PerformanceCards
                    stats={selectedStatistic}
                    positionCode={player.primaryPosition}
                  />
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
                    className="scout-btn scout-btn-sm scout-btn-secondary"
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
                    className="scout-btn scout-btn-sm scout-btn-secondary"
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
              <div className="scout-error-banner">
                <span className="scout-error-banner-icon">⚠️</span>
                <div className="scout-error-banner-body">{matchError}</div>
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length === 0 && (
              <div className="scout-empty-state compact">
                <div className="scout-empty-state-icon">📋</div>
                <h4 className="scout-empty-state-title">No Match Appearances Recorded</h4>
                <p className="scout-empty-state-desc">
                  No individual match logs found for {selectedSeasonCode} in this competition. Try selecting another season or competition above to inspect match logs.
                </p>
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length > 0 && (
              <div
                className="scout-b2b-table-wrapper"
                style={{
                  borderRadius: "8px",
                  border: "1px solid var(--scout-border-default)",
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
                          <td style={{ fontSize: "12px", color: "var(--scout-text-secondary)" }}>
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
                                  color: ctx.isHome ? "#60a5fa" : "#fbbf24",
                                  background: ctx.isHome
                                    ? "rgba(59, 130, 246, 0.16)"
                                    : "rgba(245, 158, 11, 0.16)",
                                  border: ctx.isHome
                                    ? "1px solid rgba(59, 130, 246, 0.3)"
                                    : "1px solid rgba(245, 158, 11, 0.3)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  display: "inline-block",
                                }}
                              >
                                {ctx.venuePrefix}
                              </span>
                              <span
                                style={{ fontWeight: 600, color: "var(--scout-text-primary)" }}
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
                              color: "var(--scout-text-primary)",
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
                                    ? "rgba(34, 197, 94, 0.16)"
                                    : ctx.result === "DRAW"
                                      ? "rgba(245, 158, 11, 0.16)"
                                      : ctx.result === "LOSS"
                                        ? "rgba(239, 68, 68, 0.16)"
                                        : "rgba(255, 255, 255, 0.08)",
                                color:
                                  ctx.result === "WIN"
                                    ? "#4ade80"
                                    : ctx.result === "DRAW"
                                      ? "#fbbf24"
                                      : ctx.result === "LOSS"
                                        ? "#f87171"
                                        : "var(--scout-text-muted)",
                                border:
                                  ctx.result === "WIN"
                                    ? "1px solid rgba(34, 197, 94, 0.3)"
                                    : ctx.result === "DRAW"
                                      ? "1px solid rgba(245, 158, 11, 0.3)"
                                      : ctx.result === "LOSS"
                                        ? "1px solid rgba(239, 68, 68, 0.3)"
                                        : "1px solid var(--scout-border-default)",
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
                                  ? "rgba(59, 130, 246, 0.16)"
                                  : "rgba(255, 255, 255, 0.06)",
                                color: item.isStarter ? "#60a5fa" : "var(--scout-text-muted)",
                                borderColor: item.isStarter
                                  ? "rgba(59, 130, 246, 0.3)"
                                  : "var(--scout-border-default)",
                                fontSize: "11px",
                              }}
                            >
                              {item.isStarter ? "XI" : "Sub"}
                            </span>
                          </td>

                          {/* Minutes */}
                          <td style={{ fontWeight: 600, color: "var(--scout-text-secondary)" }}>
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
