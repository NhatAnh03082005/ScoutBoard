import React, { useState, useEffect, useRef } from 'react';
import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
  PlayerItem,
  ComparisonScopeType,
  PlayerFilterParams,
  PaginationMetadata,
} from '../types/player.types';
import type { CompetitionTeamItem } from '../types/competition.types';
import { getComparisonCandidatesApi } from '../services/player.service';
import { getCurrentTeamsByCompetitionApi } from '../services/competition.service';
import { PlayerComparisonCandidateFilters } from '../components/player/PlayerComparisonCandidateFilters';
import { PlayerCard } from '../components/player/PlayerCard';
import { PlayerPagination } from '../components/player/PlayerPagination';
import { getPositionRoleInfo } from '../utils/position.utils';

interface PlayerComparisonSetupPageProps {
  playerA: PlayerDetail;
  seasonStatisticsA: PlayerSeasonStatisticItem[];
  onBack: () => void;
  onProceedComparison: (
    playerAId: string,
    playerB: PlayerItem,
    scope: ComparisonScopeType,
    seasonId: string,
    competitionId?: string,
  ) => void;
}

const parseNumericParam = (val?: number | string | null): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = typeof val === 'number' ? val : Number(val);
  return isNaN(parsed) ? undefined : parsed;
};

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

export const PlayerComparisonSetupPage: React.FC<PlayerComparisonSetupPageProps> = ({
  playerA,
  seasonStatisticsA,
  onBack,
  onProceedComparison,
}) => {
  const defaultSeasonId = React.useMemo(() => {
    if (seasonStatisticsA.length === 0) return '';
    const current = seasonStatisticsA.find((s) => s.season?.isCurrent);
    return current?.season?.id || seasonStatisticsA[0]?.season?.id || '';
  }, [seasonStatisticsA]);

  const defaultCompetitionId = React.useMemo(() => {
    if (!defaultSeasonId) return '';
    const match = seasonStatisticsA.find((s) => s.season?.id === defaultSeasonId && s.competition?.id);
    return match?.competition?.id || '';
  }, [seasonStatisticsA, defaultSeasonId]);

  const [scope, setScope] = useState<ComparisonScopeType>('COMPETITION');
  const [seasonId, setSeasonId] = useState<string>(defaultSeasonId);
  const [competitionId, setCompetitionId] = useState<string>(defaultCompetitionId);
  const [teams, setTeams] = useState<CompetitionTeamItem[]>([]);

  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  const [filters, setFilters] = useState<PlayerFilterParams>({
    currentTeamId: '',
    position: '',
    preferredFoot: '',
    nationality: '',
    minAge: '',
    maxAge: '',
    minHeightCm: '',
    maxHeightCm: '',
  });

  const [candidates, setCandidates] = useState<PlayerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<PlayerItem | null>(null);

  const latestRequestIdRef = useRef<number>(0);

  useEffect(() => {
    if (competitionId) {
      getCurrentTeamsByCompetitionApi(competitionId)
        .then((data) => {
          setTeams(data);
        })
        .catch(() => {
          setTeams([]);
        });
    } else {
      setTeams([]);
    }
  }, [competitionId]);

  const fetchCandidates = (
    targetPage: number,
    scopeOverride?: ComparisonScopeType,
    seasonIdOverride?: string,
    compIdOverride?: string,
    filterOverrides?: Partial<PlayerFilterParams>,
    searchKeywordOverride?: string,
  ) => {
    const currentScope = scopeOverride !== undefined ? scopeOverride : scope;
    const currentSeasonId = seasonIdOverride !== undefined ? seasonIdOverride : seasonId;
    const currentCompId = compIdOverride !== undefined ? compIdOverride : competitionId;
    const currentFilters = { ...filters, ...filterOverrides };
    const activeSearch = searchKeywordOverride !== undefined ? searchKeywordOverride : appliedSearch;

    if (!currentSeasonId) {
      setCandidates([]);
      setPagination(null);
      return;
    }

    if (currentScope === 'COMPETITION' && !currentCompId) {
      setCandidates([]);
      setPagination(null);
      return;
    }

    const minAgeNum = parseNumericParam(currentFilters.minAge);
    const maxAgeNum = parseNumericParam(currentFilters.maxAge);
    const minHeightNum = parseNumericParam(currentFilters.minHeightCm);
    const maxHeightNum = parseNumericParam(currentFilters.maxHeightCm);

    if (minAgeNum !== undefined && maxAgeNum !== undefined && minAgeNum > maxAgeNum) {
      setError('Minimum age cannot be greater than maximum age.');
      return;
    }

    if (minHeightNum !== undefined && maxHeightNum !== undefined && minHeightNum > maxHeightNum) {
      setError('Minimum height cannot be greater than maximum height.');
      return;
    }

    const limit = 20;
    const offset = (targetPage - 1) * limit;

    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);

    getComparisonCandidatesApi(playerA.id, {
      scope: currentScope,
      seasonId: currentSeasonId,
      competitionId: currentScope === 'COMPETITION' ? currentCompId : undefined,
      currentTeamId: currentFilters.currentTeamId || undefined,
      search: activeSearch ? activeSearch : undefined,
      position: currentFilters.position || undefined,
      preferredFoot: currentFilters.preferredFoot || undefined,
      nationality: currentFilters.nationality?.trim() || undefined,
      minAge: minAgeNum,
      maxAge: maxAgeNum,
      minHeightCm: minHeightNum,
      maxHeightCm: maxHeightNum,
      limit,
      offset,
    })
      .then((res) => {
        if (requestId === latestRequestIdRef.current) {
          setCandidates(res.items);
          setPagination(res.pagination);
        }
      })
      .catch((err: any) => {
        if (requestId === latestRequestIdRef.current) {
          setError(err.message || 'Không thể tải danh sách ứng viên so sánh');
        }
      })
      .finally(() => {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchCandidates(1, scope, seasonId, competitionId);
  }, [scope, seasonId, competitionId]);

  const handleScopeChange = (newScope: ComparisonScopeType) => {
    let newCompId = competitionId;
    if (newScope === 'COMPETITION' && !newCompId) {
      const match = seasonStatisticsA.find((s) => s.season?.id === seasonId && s.competition?.id);
      if (match) {
        newCompId = match.competition.id;
      }
    }
    setScope(newScope);
    setCompetitionId(newCompId);
    fetchCandidates(1, newScope, seasonId, newCompId);
  };

  const handleSeasonChange = (newSelectedSeasonCode: string) => {
    const targetSeasonGroup = seasonOptions.find((s) => s.seasonCode === newSelectedSeasonCode || s.id === newSelectedSeasonCode);
    if (!targetSeasonGroup) return;

    // Find all competition stats in this season group
    const comps = seasonStatisticsA.filter((stat) => stat.season?.seasonCode === targetSeasonGroup.seasonCode);
    const matchingStat = comps.find((stat) => stat.competition?.id === competitionId) || comps[0];
    const newCompId = matchingStat?.competition?.id || '';
    const newSeasonId = matchingStat?.season?.id || targetSeasonGroup.id;

    setSeasonId(newSeasonId);
    setCompetitionId(newCompId);
    fetchCandidates(1, scope, newSeasonId, newCompId);
  };

  const handleCompetitionChange = (newCompId: string) => {
    const matchingStat = seasonStatisticsA.find(
      (stat) => stat.season?.seasonCode === selectedSeason?.seasonCode && stat.competition?.id === newCompId,
    );
    const newSeasonId = matchingStat?.season?.id || seasonId;
    setSeasonId(newSeasonId);
    setCompetitionId(newCompId);
    fetchCandidates(1, scope, newSeasonId, newCompId);
  };

  const handleFilterChange = (key: keyof PlayerFilterParams, value: string | number) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    fetchCandidates(1, scope, seasonId, competitionId, updated);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setAppliedSearch(trimmed);
    fetchCandidates(1, scope, seasonId, competitionId, undefined, trimmed);
  };

  const handleResetFilters = () => {
    const defaultFilters: PlayerFilterParams = {
      currentTeamId: '',
      position: '',
      preferredFoot: '',
      nationality: '',
      minAge: '',
      maxAge: '',
      minHeightCm: '',
      maxHeightCm: '',
    };
    setSearchInput('');
    setAppliedSearch('');
    setFilters(defaultFilters);
    fetchCandidates(1, scope, seasonId, competitionId, defaultFilters, '');
  };

  const handlePageChange = (newPage: number) => {
    fetchCandidates(newPage, scope, seasonId, competitionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCandidate = (candidate: PlayerItem) => {
    if (selectedCandidate?.id === candidate.id) {
      setSelectedCandidate(null);
    } else {
      setSelectedCandidate(candidate);
    }
  };

  const handleProceed = () => {
    if (!selectedCandidate) return;
    onProceedComparison(
      playerA.id,
      selectedCandidate,
      scope,
      seasonId,
      scope === 'COMPETITION' ? competitionId : undefined,
    );
  };

  const compatiblePositions = React.useMemo(() => {
    const set = new Set<string>();
    if (playerA.primaryPosition) {
      set.add(playerA.primaryPosition.trim());
    }
    (playerA.positions || []).forEach((p) => {
      if (p.positionCode) {
        set.add(p.positionCode.trim());
      }
    });
    return Array.from(set);
  }, [playerA]);

  // Group seasons by unique seasonCode so each season appears exactly once
  const seasonOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; seasonCode: string; isCurrent: boolean; seasonIds: string[] }>();
    seasonStatisticsA.forEach((stat) => {
      if (stat.season?.seasonCode) {
        const code = stat.season.seasonCode;
        if (!map.has(code)) {
          map.set(code, {
            id: stat.season.id,
            seasonCode: code,
            isCurrent: stat.season.isCurrent || false,
            seasonIds: [stat.season.id],
          });
        } else {
          const existing = map.get(code)!;
          if (stat.season.isCurrent) existing.isCurrent = true;
          if (!existing.seasonIds.includes(stat.season.id)) {
            existing.seasonIds.push(stat.season.id);
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return b.seasonCode.localeCompare(a.seasonCode);
    });
  }, [seasonStatisticsA]);

  const selectedSeason = seasonOptions.find((s) => s.seasonIds?.includes(seasonId) || s.id === seasonId) || seasonOptions[0];

  // Competitions available under the currently selected seasonCode
  const competitionOptions = React.useMemo(() => {
    if (!selectedSeason) return [];
    const map = new Map<string, { id: string; name: string; seasonId: string }>();
    seasonStatisticsA
      .filter((stat) => stat.season?.seasonCode === selectedSeason.seasonCode)
      .forEach((stat) => {
        if (stat.competition?.id && !map.has(stat.competition.id)) {
          map.set(stat.competition.id, {
            id: stat.competition.id,
            name: stat.competition.name,
            seasonId: stat.season.id,
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [seasonStatisticsA, selectedSeason]);

  const selectedCompetition = competitionOptions.find((c) => c.id === competitionId) || competitionOptions[0];

  const playerAName = playerA.fullName || playerA.name;
  const playerAPositionRole = getPositionRoleInfo(playerA.primaryPosition);

  return (
    <div className="scout-b2b-page-container" style={{ paddingBottom: selectedCandidate ? '100px' : '32px' }}>
      {/* 1. Top Header Navigation Bar (Synchronized with PlayerDetailPage) */}
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
          <span>Back to Player Detail</span>
        </button>

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
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            }}
          >
            ⚖️ Step 1 of 2: Candidate Search & Scope Setup
          </span>
        </div>
      </div>

      {/* 2. Unified Master Hero Container: Player A Core Profile + Integrated Scope & Context Controls */}
      <div
        style={{
          background: 'linear-gradient(135deg, #091322 0%, #0d1b2e 50%, #17283c 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Sports Geometry Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            background:
              'radial-gradient(circle at 75% 30%, rgba(37, 99, 235, 0.25) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.18) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />

        {/* Upper Section: Player A Core Profile */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Player Avatar Frame */}
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
                position: 'relative',
              }}
            >
              {playerA.imageUrl ? (
                <img
                  src={playerA.imageUrl}
                  alt={playerAName}
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
                  <rect width="100" height="100" fill="#eff6ff" />
                  <circle cx="50" cy="38" r="18" fill="#94a3b8" />
                  <path
                    d="M16 90C16 68 30 57 50 57C70 57 84 68 84 90V100H16V90Z"
                    fill="#94a3b8"
                  />
                </svg>
              )}
            </div>

            {/* Beside Avatar: Player Name, Jersey #, Position Badge */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    fontStyle: 'italic',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.025em',
                    color: '#ffffff',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {playerAName}
                </h2>

                {playerA.shirtNumber && (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fcd34d',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 900,
                    }}
                  >
                    #{playerA.shirtNumber}
                  </span>
                )}

                {playerA.primaryPosition && (
                  <span
                    style={{
                      background: playerAPositionRole.hexColor,
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '12px',
                      padding: '2px 10px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {playerA.primaryPosition}
                  </span>
                )}
              </div>

              {/* Bio Attributes Sub-row */}
              <div
                style={{
                  marginTop: '8px',
                  marginLeft: '2px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span>{playerA.currentTeam?.name || 'FREE AGENT'}</span>
                <span style={{ color: '#ffffff' }}>•</span>
                <span>{playerA.nationality || '—'}</span>
                <span style={{ color: '#ffffff' }}>•</span>
                <span>{calculateAge(playerA.dateOfBirth)}</span>
                <span style={{ color: '#ffffff' }}>•</span>
                <span>{playerA.heightCm ? `${playerA.heightCm} CM` : '—'}</span>
                <span style={{ color: '#ffffff' }}>•</span>
                <span>{playerA.preferredFoot || '—'} FOOT</span>
              </div>
            </div>
          </div>

          {/* Right: TARGET PLAYER (A) HUD badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '11px',
                letterSpacing: '0.1em',
                padding: '6px 14px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                backdropFilter: 'blur(4px)',
              }}
            >
              TARGET PLAYER (A)
            </span>
          </div>
        </div>

        {/* Lower Section: Integrated Scope & Context Controls */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            zIndex: 5,
          }}
        >
          {/* Section Title & Active Context Tag */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🌐</span>
              <span>COMPARISON SCOPE & CONTEXT</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ACTIVE CONTEXT:
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                {selectedSeason?.seasonCode || 'Season'} ·{' '}
                {scope === 'ALL' ? 'All Competitions' : selectedCompetition?.name || 'Select Competition'}
              </span>
            </div>
          </div>

          {/* Controls Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: scope === 'COMPETITION' ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            {/* Comparison Scope Selector */}
            <div style={{ flex: 2 }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#94a3b8',
                  marginBottom: '6px',
                  display: 'block',
                }}
              >
                COMPARISON SCOPE
              </label>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '4px',
                  background: 'rgba(30, 41, 59, 0.9)',
                  borderRadius: '12px',
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                  gap: '4px',
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '40px',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleScopeChange('COMPETITION')}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: scope === 'COMPETITION' ? '#2563eb' : 'transparent',
                    color: scope === 'COMPETITION' ? '#ffffff' : '#94a3b8',
                    fontWeight: scope === 'COMPETITION' ? 900 : 700,
                    boxShadow: scope === 'COMPETITION' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : 'none',
                    padding: '0 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Specific Competition
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeChange('ALL')}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: scope === 'ALL' ? '#2563eb' : 'transparent',
                    color: scope === 'ALL' ? '#ffffff' : '#94a3b8',
                    fontWeight: scope === 'ALL' ? 900 : 700,
                    boxShadow: scope === 'ALL' ? '0 4px 6px -1px rgba(0, 0, 0, 0.2)' : 'none',
                    padding: '0 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  All Competitions
                </button>
              </div>
            </div>

            {/* Season Selector */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#94a3b8',
                  marginBottom: '6px',
                  display: 'block',
                }}
              >
                SEASON
              </label>
              <select
                value={selectedSeason?.seasonCode || ''}
                onChange={(e) => handleSeasonChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '12px',
                  padding: '0 12px',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {seasonOptions.map((s) => (
                  <option key={s.seasonCode} value={s.seasonCode} style={{ background: '#0f172a', color: '#ffffff' }}>
                    {s.seasonCode} {s.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Competition Selector (if scope === 'COMPETITION') */}
            {scope === 'COMPETITION' && (
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#94a3b8',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  COMPETITION
                </label>
                <select
                  value={competitionId}
                  onChange={(e) => handleCompetitionChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    padding: '0 12px',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {competitionOptions.length === 0 ? (
                    <option value="" style={{ background: '#0f172a', color: '#ffffff' }}>No competitions available</option>
                  ) : (
                    competitionOptions.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#0f172a', color: '#ffffff' }}>
                        🏆 {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="scout-b2b-alert-error" style={{ marginBottom: '24px' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Unified Control Panel (Search Bar + Filters Grid in ONE Card matching PlayerSearchPage) */}
      <PlayerComparisonCandidateFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        searchLoading={loading}
        filters={filters}
        teams={teams}
        compatiblePositions={compatiblePositions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Results Section Header (Count + Page Indicator) */}
      <div className="scout-b2b-results-header">
        <div className="scout-b2b-results-title-group">
          {pagination && (
            <div className="scout-b2b-results-count">
              <span className="scout-b2b-count-number">{pagination.total}</span>
              <span className="scout-b2b-count-label">compatible candidates found</span>
            </div>
          )}
        </div>

        {pagination && pagination.total > 0 && (
          <div className="scout-b2b-page-indicator">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
          </div>
        )}
      </div>

      {/* 5. Candidate Player Card Grid (Reusing identical visual matrix from PlayerSearchPage) */}
      {loading ? (
        <div className="scout-fc-card-grid">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={`card-skeleton-${idx}`} className="scout-fc-card scout-fc-card-skeleton">
              <div className="scout-fc-card-bg" />
              <div className="scout-fc-skeleton-shimmer" />
              <div className="scout-fc-card-top-anchor">
                <div className="scout-fc-card-header-left">
                  <div className="skeleton-line" style={{ width: '32px', height: '32px', borderRadius: '6px', marginBottom: '2px' }} />
                  <div className="skeleton-line" style={{ width: '42px', height: '18px', borderRadius: '4px' }} />
                  <div className="skeleton-line" style={{ width: '70px', height: '12px' }} />
                  <div className="skeleton-line" style={{ width: '100px', height: '14px' }} />
                </div>
              </div>
              <div className="scout-fc-card-bottom-anchor">
                <div className="skeleton-line" style={{ width: '80%', height: '22px', marginBottom: '8px' }} />
                <div className="skeleton-line" style={{ width: '60%', height: '14px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="scout-fc-empty-card">
          <span className="scout-fc-empty-icon">⚽</span>
          <h3 className="scout-fc-empty-title">No compatible players found</h3>
          <p className="scout-fc-empty-desc">
            No candidates match the selected season, competition context, compatible positions ({compatiblePositions.join(', ')}), and search filters. Try adjusting your filters or switching scope.
          </p>
          <button
            type="button"
            className="scout-b2b-btn scout-b2b-btn-secondary"
            onClick={handleResetFilters}
            style={{ marginTop: '14px' }}
          >
            <span>🔄</span>
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <div className="scout-fc-card-grid">
          {candidates.map((player) => {
            const isSelected = selectedCandidate?.id === player.id;
            return (
              <div
                key={player.id}
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease',
                  outline: isSelected ? '3px solid #2563eb' : 'none',
                  outlineOffset: '2px',
                  transform: isSelected ? 'translateY(-4px)' : undefined,
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      boxShadow: '0 4px 8px rgba(37, 99, 235, 0.4)',
                      zIndex: 20,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    ✓ Selected
                  </div>
                )}
                <PlayerCard
                  player={player}
                  onSelect={() => handleSelectCandidate(player)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Pagination Controls */}
      <PlayerPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* 7. Sticky Floating Action Bar when a candidate is selected */}
      {selectedCandidate && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 48px)',
            maxWidth: '1200px',
            padding: '14px 24px',
            background: '#ffffff',
            border: '2px solid #2563eb',
            borderRadius: '16px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 0 15px rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Selected Candidate:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '16px' }}>
                {selectedCandidate.fullName}
              </span>
              {selectedCandidate.primaryPosition && (
                <span
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedCandidate.primaryPosition}
                </span>
              )}
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                ({selectedCandidate.currentTeam?.name || 'Free Agent'})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              className="scout-sports-back-btn"
              style={{ height: '38px', padding: '0 16px', fontSize: '12px' }}
              onClick={() => setSelectedCandidate(null)}
            >
              Deselect
            </button>
            <button
              type="button"
              className="scout-sports-compare-btn"
              onClick={handleProceed}
              style={{ height: '38px', padding: '0 24px', fontSize: '13px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
              <span>Compare {playerAName} vs {selectedCandidate.fullName}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
