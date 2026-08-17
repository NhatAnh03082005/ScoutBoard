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
import { PlayerComparisonScopeSelector } from '../components/player/PlayerComparisonScopeSelector';
import { PlayerComparisonCandidateFilters } from '../components/player/PlayerComparisonCandidateFilters';
import { PlayerComparisonCandidateList } from '../components/player/PlayerComparisonCandidateList';
import { PlayerPagination } from '../components/player/PlayerPagination';

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

// Helper to parse numeric inputs cleanly and avoid Number("") === 0 pitfalls
const parseNumericParam = (val?: number | string | null): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = typeof val === 'number' ? val : Number(val);
  return isNaN(parsed) ? undefined : parsed;
};

export const PlayerComparisonSetupPage: React.FC<PlayerComparisonSetupPageProps> = ({
  playerA,
  seasonStatisticsA,
  onBack,
  onProceedComparison,
}) => {
  // Determine initial season and competition from playerA's season statistics
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

  // Scope & Context State
  const [scope, setScope] = useState<ComparisonScopeType>('COMPETITION');
  const [seasonId, setSeasonId] = useState<string>(defaultSeasonId);
  const [competitionId, setCompetitionId] = useState<string>(defaultCompetitionId);

  // Teams list for current competition
  const [teams, setTeams] = useState<CompetitionTeamItem[]>([]);

  // Search keyword states (mirrors PlayerSearchPage)
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Filters State
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

  // Candidate Data State
  const [candidates, setCandidates] = useState<PlayerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Candidate (Player B)
  const [selectedCandidate, setSelectedCandidate] = useState<PlayerItem | null>(null);

  // Request counter guard
  const latestRequestIdRef = useRef<number>(0);

  // Fetch teams when competitionId changes
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

  // Fetch candidates from API
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

    // Range Validation Checks (matching PlayerSearchPage)
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

  // Trigger candidate fetch whenever scope, seasonId, or competitionId changes
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

  const handleSeasonChange = (newSeasonId: string) => {
    let newCompId = '';
    const match = seasonStatisticsA.find((s) => s.season?.id === newSeasonId && s.competition?.id);
    if (match) {
      newCompId = match.competition.id;
    }
    setSeasonId(newSeasonId);
    setCompetitionId(newCompId);
    fetchCandidates(1, scope, newSeasonId, newCompId);
  };

  const handleCompetitionChange = (newCompId: string) => {
    setCompetitionId(newCompId);
    fetchCandidates(1, scope, seasonId, newCompId);
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

  const playerAName = playerA.fullName || playerA.name;

  return (
    <div className="player-comparison-setup-page">
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          className="scout-btn scout-btn-secondary scout-btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to {playerAName}'s Profile
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="role-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}>
            ⚖️ Step 1 of 2: Candidate Search & Scope Setup
          </span>
        </div>
      </div>

      {/* Current Player Banner (Player A) */}
      <div
        className="player-filters-card"
        style={{
          padding: '20px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Target Player for Comparison (Player A)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '2px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              overflow: 'hidden',
              flexShrink: 0,
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
              '⚽'
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {playerAName}
              </h3>
              {playerA.shirtNumber && (
                <span className="role-pill" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fde047' }}>
                  #{playerA.shirtNumber}
                </span>
              )}
              {playerA.primaryPosition && (
                <span className="status-badge status-active">
                  {playerA.primaryPosition}
                </span>
              )}
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#cbd5e1', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>🛡️ {playerA.currentTeam?.name || 'No Club'}</span>
              <span>🌍 {playerA.nationality || 'N/A'}</span>
              <span>👟 {playerA.preferredFoot || 'N/A'} Foot</span>
              <span>📏 {playerA.heightCm ? `${playerA.heightCm} cm` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Comparison Scope Selector */}
      {seasonStatisticsA.length > 0 ? (
        <PlayerComparisonScopeSelector
          scope={scope}
          seasonId={seasonId}
          competitionId={competitionId}
          seasonStatistics={seasonStatisticsA}
          onScopeChange={handleScopeChange}
          onSeasonChange={handleSeasonChange}
          onCompetitionChange={handleCompetitionChange}
        />
      ) : (
        <div className="alert-banner alert-error" style={{ marginBottom: '24px' }}>
          ⚠️ This player does not have any recorded season statistics to establish a comparison context.
        </div>
      )}

      {/* Error Banner */}
      {error && <div className="alert-banner alert-error">❌ {error}</div>}

      {/* Loading Indicator */}
      {loading && (
        <div
          className="alert-banner"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
          }}
        >
          ⌛ Loading comparison candidates...
        </div>
      )}

      {/* 2. Candidate Search by Name Form (Matching PlayerSearchPage) */}
      <form onSubmit={handleSearchSubmit} className="search-form" style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="scout-input"
            placeholder="Search candidate by player name... (e.g. Palmer, Rodri, Gabriel)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="submit"
            className="scout-btn"
            style={{ width: 'auto', padding: '0 24px', margin: 0, whiteSpace: 'nowrap' }}
            disabled={loading}
          >
            🔍 Search
          </button>
        </div>
      </form>

      {/* 3. Candidate Filters */}
      <PlayerComparisonCandidateFilters
        filters={filters}
        teams={teams}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Candidate List */}
      <PlayerComparisonCandidateList
        candidates={candidates}
        selectedCandidateId={selectedCandidate?.id || null}
        loading={loading}
        error={error}
        onSelectCandidate={handleSelectCandidate}
      />

      {/* 5. Pagination */}
      <PlayerPagination pagination={pagination} onPageChange={handlePageChange} />

      {/* 6. Sticky Action Bar when a candidate is selected */}
      {selectedCandidate && (
        <div
          style={{
            position: 'sticky',
            bottom: '20px',
            marginTop: '24px',
            padding: '16px 24px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
              Selected Candidate:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '16px' }}>
                {selectedCandidate.fullName}
              </span>
              <span className="role-pill" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                {selectedCandidate.primaryPosition || 'Player'}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                ({selectedCandidate.currentTeam?.name || 'Free Agent'})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="scout-btn scout-btn-secondary scout-btn-sm"
              onClick={() => setSelectedCandidate(null)}
            >
              Deselect
            </button>
            <button
              type="button"
              className="scout-btn"
              onClick={handleProceed}
              style={{
                width: 'auto',
                padding: '8px 24px',
                background: '#38bdf8',
                color: '#090d16',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)',
              }}
            >
              ⚔️ Compare {playerAName} vs {selectedCandidate.fullName} ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
