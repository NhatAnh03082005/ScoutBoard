import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  PlayerDetail,
  PlayerTeamHistoryItem,
  PlayerSeasonStatisticItem,
  PlayerMatchStatisticItem,
} from '../types/player.types';
import {
  getPlayerByIdApi,
  getPlayerTeamHistoryApi,
  getPlayerSeasonStatisticsApi,
  getPlayerMatchStatisticsApi,
} from '../services/player.service';

interface PlayerDetailPageProps {
  playerId: string;
  onBack: () => void;
}

export const PlayerDetailPage: React.FC<PlayerDetailPageProps> = ({ playerId, onBack }) => {
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
  const [selectedSeasonCode, setSelectedSeasonCode] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Match Statistics (Match Log) state
  const [matchStatistics, setMatchStatistics] = useState<PlayerMatchStatisticItem[]>([]);
  const [matchLoading, setMatchLoading] = useState<boolean>(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchOffset, setMatchOffset] = useState<number>(0);
  const [matchTotal, setMatchTotal] = useState<number>(0);
  const matchLimit = 10;

  // Request race guard counter
  const latestMatchRequestIdRef = useRef<number>(0);

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
          setError(err.message || 'Không thể tải thông tin chi tiết cầu thủ');
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
          setHistoryError(err.message || 'Không thể tải lịch sử thi đấu của cầu thủ');
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

          // Default Season Selection Rule:
          // 1. Season with isCurrent = true
          // 2. Otherwise first season in list
          if (stats.length > 0) {
            const currentSeasonStat = stats.find((s) => s.season.isCurrent);
            const defaultSeasonCode = currentSeasonStat
              ? currentSeasonStat.season.seasonCode || 'N/A'
              : stats[0].season.seasonCode || 'N/A';
            setSelectedSeasonCode(defaultSeasonCode);
          }
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setStatsError(err.message || 'Không thể tải thống kê mùa giải của cầu thủ');
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

  // Derived: Available Seasons list grouped by seasonCode (deduplicated)
  const availableSeasons = useMemo(() => {
    const map = new Map<string, { seasonCode: string; isCurrent: boolean }>();
    seasonStatistics.forEach((stat) => {
      const code = stat.season.seasonCode || 'N/A';
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
      .filter((s) => (s.season.seasonCode || 'N/A') === selectedSeasonCode)
      .forEach((s) => {
        if (!map.has(s.competition.id)) {
          map.set(s.competition.id, s.competition);
        }
      });
    return Array.from(map.values());
  }, [seasonStatistics, selectedSeasonCode]);

  // Auto-select valid competition when selectedSeasonCode or availableCompetitions changes
  useEffect(() => {
    if (availableCompetitions.length > 0) {
      const isValid = availableCompetitions.some((c) => c.id === selectedCompetitionId);
      if (!isValid) {
        setSelectedCompetitionId(availableCompetitions[0].id);
      }
    } else {
      setSelectedCompetitionId('');
    }
  }, [selectedSeasonCode, availableCompetitions]);

  // Derived: Matching records for selected Season Code + Competition
  const matchingRecords = useMemo(() => {
    if (!selectedSeasonCode || !selectedCompetitionId) return [];
    return seasonStatistics.filter(
      (s) => (s.season.seasonCode || 'N/A') === selectedSeasonCode && s.competition.id === selectedCompetitionId,
    );
  }, [seasonStatistics, selectedSeasonCode, selectedCompetitionId]);

  // Derived: Available Teams if > 1 record for selected Season + Competition
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

  // Auto-select team if multiple teams exist
  useEffect(() => {
    if (availableTeams.length > 0) {
      const isValid = availableTeams.some((t) => t.id === selectedTeamId);
      if (!isValid) {
        setSelectedTeamId(availableTeams[0].id);
      }
    } else {
      setSelectedTeamId('');
    }
  }, [availableTeams]);

  // Reset match log pagination offset to 0 whenever context (Season, Competition, Team) changes
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

  // Fetch Match Statistics (Match Log) with race condition guard & fallback
  useEffect(() => {
    if (!playerId) return;

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
        if (requestId !== latestMatchRequestIdRef.current) return;
        // Fallback: If 0 items returned for specific filters, fetch all recent match stats for player
        if (res.items.length === 0 && (seasonId || competitionId || teamId) && matchOffset === 0) {
          return getPlayerMatchStatisticsApi(playerId, {
            limit: matchLimit,
            offset: 0,
          });
        }
        return res;
      })
      .then((res) => {
        if (requestId === latestMatchRequestIdRef.current && res) {
          setMatchStatistics(res.items);
          setMatchTotal(res.pagination ? res.pagination.total : res.items.length);
        }
      })
      .catch((err: any) => {
        if (requestId === latestMatchRequestIdRef.current) {
          setMatchError(err.message || 'Không thể tải danh sách trận đấu của cầu thủ');
        }
      })
      .finally(() => {
        if (requestId === latestMatchRequestIdRef.current) {
          setMatchLoading(false);
        }
      });
  }, [playerId, selectedStatistic, selectedCompetitionId, selectedTeamId, matchOffset]);

  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs (${birthDate.toLocaleDateString()})`;
  };

  const formatPer90 = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return val.toFixed(2);
  };

  // Helper: Determine Match Outcome & Opponent Info for a Match Log item safely
  const getMatchContext = (item: PlayerMatchStatisticItem) => {
    const { match, team } = item;
    const isHome = team ? team.id === match.homeTeam.id : true;
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const venuePrefix = isHome ? 'vs' : '@';

    let result: 'WIN' | 'DRAW' | 'LOSS' | null = null;
    let scoreText = '—';

    if (match.homeScore !== null && match.awayScore !== null && !isNaN(match.homeScore) && !isNaN(match.awayScore)) {
      scoreText = `${match.homeScore} - ${match.awayScore}`;
      if (match.homeScore === match.awayScore) {
        result = 'DRAW';
      } else if (isHome) {
        result = match.homeScore > match.awayScore ? 'WIN' : 'LOSS';
      } else {
        result = match.awayScore > match.homeScore ? 'WIN' : 'LOSS';
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

  const playerName = player ? player.fullName || player.name : '';
  const currentPage = Math.floor(matchOffset / matchLimit) + 1;
  const totalPages = Math.ceil(matchTotal / matchLimit) || 1;

  return (
    <div className="player-detail-page">
      {/* Top Header & Back Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          className="scout-btn scout-btn-secondary scout-btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to Player Search
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ marginBottom: '20px' }}>
          <div className="alert-banner alert-error" style={{ marginBottom: '12px' }}>
            ❌ {error}
          </div>
          <button
            type="button"
            className="scout-btn scout-btn-secondary"
            onClick={onBack}
          >
            Return to Search Page
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          className="alert-banner"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          ⌛ Loading player details...
        </div>
      )}

      {/* Player Profile Content */}
      {!loading && !error && player && (
        <div className="player-filters-card" style={{ padding: '24px' }}>
          {/* Main Banner Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '20px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar Image */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {player.imageUrl ? (
                <img
                  src={player.imageUrl}
                  alt={playerName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                '⚽'
              )}
            </div>

            {/* Name & Club */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {playerName}
                </h2>
                {player.shirtNumber && (
                  <span
                    className="role-pill"
                    style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fde047', fontWeight: 700 }}
                  >
                    #{player.shirtNumber}
                  </span>
                )}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {player.currentTeam ? (
                  <span className="role-pill" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>
                    🛡️ {player.currentTeam.name} ({player.currentTeam.shortName || 'N/A'})
                  </span>
                ) : (
                  <span className="role-pill" style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                    🏷️ Free Agent / No Current Club
                  </span>
                )}

                {player.primaryPosition && (
                  <span className="status-badge status-active">
                    {player.primaryPosition}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Attributes Grid */}
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
            📋 Player Profile & Attributes
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Age / Date of Birth */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                📅 AGE / DATE OF BIRTH
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                {calculateAge(player.dateOfBirth)}
              </div>
            </div>

            {/* Nationality */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                🌐 NATIONALITY
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                {player.nationality || 'N/A'}
              </div>
            </div>

            {/* Height */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                📏 HEIGHT
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                {player.heightCm ? `${player.heightCm} cm` : 'N/A'}
              </div>
            </div>

            {/* Weight (if available) */}
            {player.weightKg !== undefined && player.weightKg !== null && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ⚖️ WEIGHT
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                  {player.weightKg} kg
                </div>
              </div>
            )}

            {/* Preferred Foot */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                🦶 PREFERRED FOOT
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                {player.preferredFoot || 'N/A'}
              </div>
            </div>

            {/* Positions */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                ⚽ POSITIONS
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {player.positions && player.positions.length > 0 ? (
                  player.positions.map((pos) => (
                    <span
                      key={pos.id}
                      className="status-badge"
                      style={{
                        background: pos.isPrimary
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: pos.isPrimary ? '#4ade80' : '#cbd5e1',
                      }}
                    >
                      {pos.positionCode} {pos.isPrimary ? '(Primary)' : ''}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                    {player.primaryPosition || 'N/A'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Career History Section */}
          <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              📜 CAREER HISTORY
            </h3>

            {loadingHistory && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                ⌛ Loading career history...
              </div>
            )}

            {historyError && (
              <div className="alert-banner alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>
                ⚠️ {historyError}
              </div>
            )}

            {!loadingHistory && !historyError && teamHistory.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                No career history available.
              </div>
            )}

            {!loadingHistory && !historyError && teamHistory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teamHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: item.isCurrent ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                      border: item.isCurrent ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        🛡️
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.team.name}
                          {item.isCurrent && (
                            <span className="status-badge status-active" style={{ fontSize: '11px', padding: '2px 8px' }}>
                              Current Club
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.joinedAt ? new Date(item.joinedAt).getFullYear() : 'N/A'} - {item.isCurrent ? 'Present' : (item.leftAt ? new Date(item.leftAt).getFullYear() : 'N/A')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {item.shirtNumber !== undefined && item.shirtNumber !== null && (
                        <span className="role-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fde047', fontWeight: 600 }}>
                          #{item.shirtNumber}
                        </span>
                      )}
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {item.team.country || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Season Statistics Section */}
          <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              📊 SEASON STATISTICS
            </h3>

            {statsLoading && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                ⌛ Loading season statistics...
              </div>
            )}

            {statsError && (
              <div className="alert-banner alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>
                ⚠️ {statsError}
              </div>
            )}

            {!statsLoading && !statsError && seasonStatistics.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                No season statistics available.
              </div>
            )}

            {!statsLoading && !statsError && seasonStatistics.length > 0 && (
              <div>
                {/* Selectors Bar with Fixed Widths to Prevent Layout Shift */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {/* Season Dropdown (Fixed Width) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '220px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      🗓️ SEASON
                    </label>
                    <select
                      className="scout-select"
                      value={selectedSeasonCode}
                      onChange={(e) => setSelectedSeasonCode(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {availableSeasons.map((s) => (
                        <option key={s.seasonCode} value={s.seasonCode}>
                          {s.seasonCode} {s.isCurrent ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Competition Dropdown (Fixed Width) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '260px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      🏆 COMPETITION
                    </label>
                    <select
                      className="scout-select"
                      value={selectedCompetitionId}
                      onChange={(e) => setSelectedCompetitionId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {availableCompetitions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Dropdown (Fixed Width - Conditional if multiple teams exist) */}
                  {availableTeams.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '220px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        🛡️ TEAM
                      </label>
                      <select
                        className="scout-select"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        {availableTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Selected Statistics Card View */}
                {selectedStatistic && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '20px',
                    }}
                  >
                    {/* Header Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingBottom: '12px',
                        marginBottom: '18px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          className="role-pill"
                          style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 700 }}
                        >
                          🗓️ {selectedStatistic.season.seasonCode}
                        </span>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                          🏆 {selectedStatistic.competition.name}
                        </span>
                      </div>

                      {selectedStatistic.team && (
                        <div style={{ fontSize: '14px', color: '#93c5fd', fontWeight: 600 }}>
                          🛡️ {selectedStatistic.team.name}
                        </div>
                      )}
                    </div>

                    {/* Metric Cards Grid: 5 Categories (Including PER-90 METRICS) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {/* Category 1: Playing */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          padding: '14px',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                          🏃 Playing
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Appearances:</span> <strong>{selectedStatistic.appearances}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Starts:</span> <strong>{selectedStatistic.starts}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Minutes:</span> <strong>{selectedStatistic.minutesPlayed}'</strong>
                        </div>
                      </div>

                      {/* Category 2: Attacking */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          padding: '14px',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                          ⚽ Attacking
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Goals:</span> <strong style={{ color: '#4ade80' }}>{selectedStatistic.goals}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Assists:</span> <strong style={{ color: '#60a5fa' }}>{selectedStatistic.assists}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Shots:</span> <strong>{selectedStatistic.shots}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Shots on Target:</span> <strong>{selectedStatistic.shotsOnTarget}</strong>
                        </div>
                      </div>

                      {/* Category 3: Passing */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          padding: '14px',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                          🎯 Passing
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Passes:</span> <strong>{selectedStatistic.passes}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Pass Accuracy:</span> <strong>{selectedStatistic.passAccuracy !== null && selectedStatistic.passAccuracy !== undefined ? `${selectedStatistic.passAccuracy}%` : 'N/A'}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Key Passes:</span> <strong>{selectedStatistic.keyPasses}</strong>
                        </div>
                      </div>

                      {/* Category 4: Defending */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          padding: '14px',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                          🛡️ Defending
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Tackles:</span> <strong>{selectedStatistic.tackles}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span>Interceptions:</span> <strong>{selectedStatistic.interceptions}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Duels Won:</span> <strong>{selectedStatistic.duelsWon}</strong>
                        </div>
                      </div>

                      {/* Category 5: PER-90 METRICS */}
                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '14px',
                          borderRadius: '8px',
                          gridColumn: '1 / -1',
                        }}
                      >
                        <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚡ PER 90 METRICS (Norm. per 90 mins)
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px',
                          }}
                        >
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Goals / 90:</span> <strong style={{ color: '#34d399' }}>{formatPer90(selectedStatistic.goalsPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Assists / 90:</span> <strong style={{ color: '#60a5fa' }}>{formatPer90(selectedStatistic.assistsPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Shots / 90:</span> <strong>{formatPer90(selectedStatistic.shotsPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Shots on Target / 90:</span> <strong>{formatPer90(selectedStatistic.shotsOnTargetPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Passes / 90:</span> <strong>{formatPer90(selectedStatistic.passesPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Key Passes / 90:</span> <strong>{formatPer90(selectedStatistic.keyPassesPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tackles / 90:</span> <strong>{formatPer90(selectedStatistic.tacklesPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Interceptions / 90:</span> <strong>{formatPer90(selectedStatistic.interceptionsPer90)}</strong>
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Duels Won / 90:</span> <strong>{formatPer90(selectedStatistic.duelsWonPer90)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RECENT MATCH LOG SECTION */}
          <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                ⚔️ RECENT MATCH LOG
              </h3>

              {/* Match Pagination Bar */}
              {!matchLoading && !matchError && matchTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="scout-btn scout-btn-secondary scout-btn-sm"
                    disabled={matchOffset === 0}
                    onClick={() => setMatchOffset((prev) => Math.max(0, prev - matchLimit))}
                    style={{ opacity: matchOffset === 0 ? 0.5 : 1, cursor: matchOffset === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="scout-btn scout-btn-secondary scout-btn-sm"
                    disabled={matchOffset + matchLimit >= matchTotal}
                    onClick={() => setMatchOffset((prev) => prev + matchLimit)}
                    style={{
                      opacity: matchOffset + matchLimit >= matchTotal ? 0.5 : 1,
                      cursor: matchOffset + matchLimit >= matchTotal ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {matchLoading && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                ⌛ Loading match statistics...
              </div>
            )}

            {matchError && (
              <div className="alert-banner alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>
                ⚠️ {matchError}
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                No match statistics available for this selection.
              </div>
            )}

            {!matchLoading && !matchError && matchStatistics.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
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
                      <th>KP</th>
                      <th>Tk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchStatistics.map((item) => {
                      const ctx = getMatchContext(item);
                      const kickoffStr = item.match.kickoffAt
                        ? new Date(item.match.kickoffAt).toLocaleDateString()
                        : 'N/A';

                      return (
                        <tr key={item.id}>
                          {/* Date */}
                          <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {kickoffStr}
                          </td>

                          {/* Match / Opponent */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: ctx.isHome ? '#93c5fd' : '#fde047',
                                  background: ctx.isHome ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {ctx.venuePrefix}
                              </span>
                              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                                {ctx.opponent ? (ctx.opponent.shortName || ctx.opponent.name) : 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Score */}
                          <td style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px' }}>
                            {ctx.scoreText}
                          </td>

                          {/* Result Badge */}
                          <td>
                            <span
                              className="role-pill"
                              style={{
                                background:
                                  ctx.result === 'WIN'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : ctx.result === 'DRAW'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : ctx.result === 'LOSS'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : 'rgba(148, 163, 184, 0.2)',
                                color:
                                  ctx.result === 'WIN'
                                    ? '#4ade80'
                                    : ctx.result === 'DRAW'
                                    ? '#fde047'
                                    : ctx.result === 'LOSS'
                                    ? '#f87171'
                                    : '#cbd5e1',
                                fontWeight: 800,
                                fontSize: '12px',
                                padding: '2px 8px',
                              }}
                            >
                              {ctx.result === 'WIN' ? 'W' : ctx.result === 'DRAW' ? 'D' : ctx.result === 'LOSS' ? 'L' : '—'}
                            </span>
                          </td>

                          {/* Role: XI / Sub */}
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                background: item.isStarter ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: item.isStarter ? '#60a5fa' : '#cbd5e1',
                                fontSize: '11px',
                              }}
                            >
                              {item.isStarter ? 'XI' : 'Sub'}
                            </span>
                          </td>

                          {/* Minutes */}
                          <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {item.minutesPlayed}'
                          </td>

                          {/* Rating */}
                          <td>
                            {item.rating !== null && item.rating !== undefined ? (
                              <span style={{ color: '#fde047', fontWeight: 700, fontSize: '13px' }}>
                                ⭐ {Number(item.rating).toFixed(1)}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>

                          {/* Goals */}
                          <td style={{ fontWeight: 700, color: item.goals > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                            {item.goals}
                          </td>

                          {/* Assists */}
                          <td style={{ fontWeight: 700, color: item.assists > 0 ? '#60a5fa' : 'var(--text-muted)' }}>
                            {item.assists}
                          </td>

                          {/* Shots */}
                          <td>{item.shots}</td>

                          {/* Key Passes */}
                          <td>{item.keyPasses}</td>

                          {/* Tackles */}
                          <td>{item.tackles}</td>
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
