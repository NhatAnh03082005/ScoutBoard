import React, { useState, useEffect, useCallback } from 'react';
import type {
  PlayerItem,
  PlayerDetail,
  PlayerSeasonStatisticItem,
  PlayerFilterParams,
  PaginationMetadata,
  ComparisonScopeType,
  GroupNode,
} from '../types/player.types';
import type { CompetitionItem, CompetitionTeamItem } from '../types/competition.types';
import { searchPlayersApi, getAvailablePositionsApi, queryPlayersApi } from '../services/player.service';
import { getCompetitionsApi, getCurrentTeamsByCompetitionApi } from '../services/competition.service';
import { PlayerFilters } from '../components/player/PlayerFilters';
import { PlayerCardGrid } from '../components/player/PlayerCardGrid';
import { PlayerTable } from '../components/player/PlayerTable';
import { AddToShortlistModal } from '../components/shortlist/AddToShortlistModal';
import { PlayerPagination } from '../components/player/PlayerPagination';
import { PlayerDetailPage } from './PlayerDetailPage';
import { PlayerComparisonSetupPage } from './PlayerComparisonSetupPage';
import { PlayerComparisonPage } from './PlayerComparisonPage';
import {
  PlayerAdvancedQueryBuilder,
  defaultGroupNode,
} from '../components/player/PlayerAdvancedQueryBuilder';

type ViewMode = 'SEARCH' | 'DETAIL' | 'COMPARISON_SETUP' | 'COMPARISON_VIEW';

// Helper to parse numeric inputs cleanly and avoid Number("") === 0 pitfalls
const parseNumericParam = (val?: number | string | null): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = typeof val === 'number' ? val : Number(val);
  return isNaN(parsed) ? undefined : parsed;
};

interface PlayerSearchPageProps {
  initialPlayerId?: string | null;
  onClearInitialPlayerId?: () => void;
}

export const PlayerSearchPage: React.FC<PlayerSearchPageProps> = ({
  initialPlayerId,
  onClearInitialPlayerId,
}) => {
  // Navigation View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>(initialPlayerId ? 'DETAIL' : 'SEARCH');

  // Search Results & Pagination
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Player for Detail View
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId || null);

  useEffect(() => {
    if (initialPlayerId) {
      setSelectedPlayerId(initialPlayerId);
      setViewMode('DETAIL');
    }
  }, [initialPlayerId]);

  // Comparison State
  const [comparisonPlayerA, setComparisonPlayerA] = useState<PlayerDetail | null>(null);
  const [comparisonSeasonStatsA, setComparisonSeasonStatsA] = useState<PlayerSeasonStatisticItem[]>([]);
  const [comparisonPlayerB, setComparisonPlayerB] = useState<PlayerItem | null>(null);
  const [comparisonScope, setComparisonScope] = useState<ComparisonScopeType>('COMPETITION');
  const [comparisonSeasonId, setComparisonSeasonId] = useState<string>('');
  const [comparisonCompetitionId, setComparisonCompetitionId] = useState<string | undefined>(undefined);

  // Competition & Club state
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [teams, setTeams] = useState<CompetitionTeamItem[]>([]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);

  // Results View Mode (Cards Grid vs Dense Table)
  const [resultsViewMode, setResultsViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Search Mode Toggle
  type SearchMode = 'BASIC' | 'ADVANCED';
  const [searchMode, setSearchMode] = useState<SearchMode>('BASIC');

  // Advanced Query State (completely separate from Basic state)
  const [advancedPlayers, setAdvancedPlayers] = useState<PlayerItem[]>([]);
  const [advancedPagination, setAdvancedPagination] = useState<PaginationMetadata | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [advancedCurrentQuery, setAdvancedCurrentQuery] = useState<GroupNode>(() => defaultGroupNode());

  // Shortlist Modal State for Table & Global Quick-Add
  const [shortlistTargetPlayer, setShortlistTargetPlayer] = useState<PlayerItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Controlled input value for typing search keyword
  const [searchInput, setSearchInput] = useState<string>('');
  // Applied search keyword currently active for API queries
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  const [filters, setFilters] = useState<PlayerFilterParams>({
    competitionId: '',
    currentTeamId: '',
    position: '',
    nationality: '',
    minAge: '',
    maxAge: '',
    minHeightCm: '',
    maxHeightCm: '',
    minWeightKg: '',
    maxWeightKg: '',
  });

  // Centralized API Fetch Helper
  const fetchPlayersData = (
    page: number,
    filterOverrides?: Partial<PlayerFilterParams>,
    searchKeywordOverride?: string,
  ) => {
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    const currentFilters = {
      ...filters,
      ...filterOverrides,
    };

    const activeSearch = searchKeywordOverride !== undefined ? searchKeywordOverride : appliedSearch;

    // Parse numeric age, height, and weight parameters
    const minAgeNum = parseNumericParam(currentFilters.minAge);
    const maxAgeNum = parseNumericParam(currentFilters.maxAge);
    const minHeightNum = parseNumericParam(currentFilters.minHeightCm);
    const maxHeightNum = parseNumericParam(currentFilters.maxHeightCm);
    const minWeightNum = parseNumericParam(currentFilters.minWeightKg);
    const maxWeightNum = parseNumericParam(currentFilters.maxWeightKg);

    // Range Validation Checks
    if (minAgeNum !== undefined && maxAgeNum !== undefined && minAgeNum > maxAgeNum) {
      setError('Minimum age cannot be greater than maximum age.');
      return;
    }

    if (minHeightNum !== undefined && maxHeightNum !== undefined && minHeightNum > maxHeightNum) {
      setError('Minimum height cannot be greater than maximum height.');
      return;
    }

    if (minWeightNum !== undefined && maxWeightNum !== undefined && minWeightNum > maxWeightNum) {
      setError('Minimum weight cannot be greater than maximum weight.');
      return;
    }

    setLoading(true);
    setError(null);

    const queryParams: PlayerFilterParams = {
      limit,
      offset,
      search: activeSearch ? activeSearch : undefined,
      competitionId: currentFilters.competitionId ? currentFilters.competitionId : undefined,
      currentTeamId: currentFilters.currentTeamId ? currentFilters.currentTeamId : undefined,
      position: currentFilters.position ? currentFilters.position : undefined,
      nationality: currentFilters.nationality && currentFilters.nationality.trim() !== '' ? currentFilters.nationality.trim() : undefined,
      minAge: minAgeNum,
      maxAge: maxAgeNum,
      minHeightCm: minHeightNum,
      maxHeightCm: maxHeightNum,
      minWeightKg: minWeightNum,
      maxWeightKg: maxWeightNum,
    };

    searchPlayersApi(queryParams)
      .then((data) => {
        setPlayers(data.items);
        setPagination(data.pagination);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to fetch player records.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial Load: Fetch Competitions and First Page of Players
  useEffect(() => {
    getCompetitionsApi()
      .then((data) => {
        setCompetitions(data);
      })
      .catch((err: any) => {
        console.error('Failed to load competitions:', err);
      });

    getAvailablePositionsApi()
      .then((positions) => {
        setAvailablePositions(positions);
      })
      .catch((err: any) => {
        console.error('Failed to load available positions:', err);
      });

    fetchPlayersData(1);
  }, []);

  // Fetch Teams whenever competition filter changes
  const handleCompetitionChange = (competitionId: string) => {
    const updatedFilters = {
      ...filters,
      competitionId,
      currentTeamId: '', // Reset team when competition changes
    };
    setFilters(updatedFilters);

    if (competitionId) {
      setLoadingTeams(true);
      getCurrentTeamsByCompetitionApi(competitionId)
        .then((data) => {
          setTeams(data);
        })
        .catch((err: any) => {
          console.error('Failed to load teams for competition:', err);
          setTeams([]);
        })
        .finally(() => {
          setLoadingTeams(false);
        });
    } else {
      setTeams([]);
    }

    fetchPlayersData(1, updatedFilters);
  };

  const handleTeamChange = (currentTeamId: string) => {
    const updatedFilters = { ...filters, currentTeamId };
    setFilters(updatedFilters);
    fetchPlayersData(1, updatedFilters);
  };

  const handleFilterChange = (key: keyof PlayerFilterParams, value: string | number) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    fetchPlayersData(1, updatedFilters);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setAppliedSearch(trimmed);
    fetchPlayersData(1, undefined, trimmed);
  };

  const handlePageChange = (newPage: number) => {
    fetchPlayersData(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setViewMode('DETAIL');
  };

  const handleBackToSearch = () => {
    setSelectedPlayerId(null);
    setViewMode('SEARCH');
    if (onClearInitialPlayerId) {
      onClearInitialPlayerId();
    }
  };

  const handleStartComparison = (
    player: PlayerDetail,
    seasonStats: PlayerSeasonStatisticItem[],
  ) => {
    setComparisonPlayerA(player);
    setComparisonSeasonStatsA(seasonStats);
    setViewMode('COMPARISON_SETUP');
  };

  const handleBackToDetailFromSetup = () => {
    setViewMode('DETAIL');
  };

  const handleProceedToComparison = (
    _playerAId: string,
    playerB: PlayerItem,
    scope: ComparisonScopeType,
    seasonId: string,
    competitionId?: string,
  ) => {
    setComparisonPlayerB(playerB);
    setComparisonScope(scope);
    setComparisonSeasonId(seasonId);
    setComparisonCompetitionId(competitionId);
    setViewMode('COMPARISON_VIEW');
  };

  const handleBackToSetupFromComparison = () => {
    setViewMode('COMPARISON_SETUP');
  };

  const handleBackToDetailFromComparison = () => {
    setViewMode('DETAIL');
  };

  const handleResetFilters = () => {
    const defaultFilters: PlayerFilterParams = {
      competitionId: '',
      currentTeamId: '',
      position: '',
      nationality: '',
      minAge: '',
      maxAge: '',
      minHeightCm: '',
      maxHeightCm: '',
      minWeightKg: '',
      maxWeightKg: '',
    };

    setSearchInput('');
    setAppliedSearch('');
    setFilters(defaultFilters);
    setTeams([]);
    fetchPlayersData(1, defaultFilters, '');
  };

  // Advanced Query Handler
  const handleAdvancedExecute = useCallback((query: GroupNode, page = 1) => {
    const limit = advancedPagination?.limit ?? 20;
    const offset = (page - 1) * limit;
    setAdvancedCurrentQuery(query);
    setAdvancedLoading(true);
    setAdvancedError(null);
    queryPlayersApi({ query, pagination: { limit, offset } })
      .then((data) => {
        setAdvancedPlayers(data.items);
        setAdvancedPagination(data.pagination);
      })
      .catch((err: any) => {
        setAdvancedError(err.message || 'Advanced query failed.');
      })
      .finally(() => setAdvancedLoading(false));
  }, [advancedPagination?.limit]);

  const handleAdvancedPageChange = useCallback((newPage: number) => {
    handleAdvancedExecute(advancedCurrentQuery, newPage);
  }, [advancedCurrentQuery, handleAdvancedExecute]);

  // 1. Render Side-by-Side Comparison View
  if (viewMode === 'COMPARISON_VIEW' && selectedPlayerId && comparisonPlayerB) {
    return (
      <PlayerComparisonPage
        playerAId={selectedPlayerId}
        playerBId={comparisonPlayerB.id}
        scope={comparisonScope}
        seasonId={comparisonSeasonId}
        competitionId={comparisonCompetitionId}
        onBackToSetup={handleBackToSetupFromComparison}
        onBackToDetail={handleBackToDetailFromComparison}
      />
    );
  }

  // 2. Render Comparison Setup / Candidate Search View
  if (viewMode === 'COMPARISON_SETUP' && comparisonPlayerA) {
    return (
      <PlayerComparisonSetupPage
        playerA={comparisonPlayerA}
        seasonStatisticsA={comparisonSeasonStatsA}
        onBack={handleBackToDetailFromSetup}
        onProceedComparison={handleProceedToComparison}
      />
    );
  }

  // 3. Render Detail View if a player is selected
  if (viewMode === 'DETAIL' && selectedPlayerId) {
    return (
      <PlayerDetailPage
        playerId={selectedPlayerId}
        onBack={handleBackToSearch}
        onCompare={handleStartComparison}
      />
    );
  }

  // 4. Render B2B SaaS Master Search View
  return (
    <div className="scout-b2b-page-container">
      {/* 1. Clean Page Header with Brand Blue Title */}
      <div className="scout-b2b-header">
        <h1 className="scout-b2b-title">Player Search</h1>
        <p className="scout-b2b-subtitle">
          Discover, analyze, and extract professional player data profiles.
        </p>
      </div>

      {/* Search Mode Tab Toggle */}
      <div className="scout-search-mode-tabs" role="tablist" aria-label="Search mode">
        <button
          type="button"
          role="tab"
          id="tab-basic"
          aria-selected={searchMode === 'BASIC'}
          className={`scout-search-mode-tab ${searchMode === 'BASIC' ? 'active' : ''}`}
          onClick={() => setSearchMode('BASIC')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Basic Search
        </button>
        <button
          type="button"
          role="tab"
          id="tab-advanced"
          aria-selected={searchMode === 'ADVANCED'}
          className={`scout-search-mode-tab ${searchMode === 'ADVANCED' ? 'active' : ''}`}
          onClick={() => setSearchMode('ADVANCED')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 6h16M8 12h8M12 18h0" />
          </svg>
          Advanced Query
          <span className="scout-search-mode-badge">β</span>
        </button>
      </div>

      {/* Error Alert Banner */}
      {searchMode === 'BASIC' && error && (
        <div className="scout-b2b-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── ADVANCED MODE ───────────────────────────────────────────────── */}
      {searchMode === 'ADVANCED' && (
        <>
          <PlayerAdvancedQueryBuilder
            onExecute={handleAdvancedExecute}
            loading={advancedLoading}
            error={advancedError}
          />

          {/* Advanced results header */}
          {advancedPagination && (
            <div className="scout-b2b-results-header">
              <div className="scout-b2b-results-title-group">
                <div className="scout-b2b-results-count">
                  <span className="scout-b2b-count-number">{advancedPagination.total}</span>
                  <span className="scout-b2b-count-label">players matched</span>
                </div>
              </div>
              <div className="scout-b2b-page-indicator">
                Page {Math.floor(advancedPagination.offset / advancedPagination.limit) + 1} / {Math.max(1, Math.ceil(advancedPagination.total / advancedPagination.limit))}
              </div>
            </div>
          )}

          {/* Advanced results grid */}
          <PlayerCardGrid
            players={advancedPlayers}
            loading={advancedLoading}
            onPlayerSelect={handlePlayerSelect}
            onResetFilters={() => { setAdvancedPlayers([]); setAdvancedPagination(null); }}
          />

          {/* Advanced pagination */}
          <PlayerPagination
            pagination={advancedPagination}
            onPageChange={handleAdvancedPageChange}
          />
        </>
      )}

      {/* ── BASIC MODE ──────────────────────────────────────────────────── */}
      {searchMode === 'BASIC' && (
        <>
          {/* 2. Unified Control Panel (Search Bar + Filters Grid in ONE Card) */}
          <PlayerFilters
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={handleSearchSubmit}
            searchLoading={loading}
            filters={filters}
            competitions={competitions}
            teams={teams}
            availablePositions={availablePositions}
            loadingTeams={loadingTeams}
            onFilterChange={handleFilterChange}
            onCompetitionChange={handleCompetitionChange}
            onTeamChange={handleTeamChange}
            onResetFilters={handleResetFilters}
            onClearSearch={() => {
              setSearchInput('');
              setAppliedSearch('');
              fetchPlayersData(1, undefined, '');
            }}
          />

          {/* 3. Results Section Header (Count + View Toggle + Page Indicator) */}
          <div className="scout-b2b-results-header">
            <div className="scout-b2b-results-title-group">
              {pagination && (
                <div className="scout-b2b-results-count">
                  <span className="scout-b2b-count-number">{pagination.total}</span>
                  <span className="scout-b2b-count-label">players found</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* View Mode Toggle: Cards vs Table */}
              <div className="scout-view-mode-segmented">
                <button
                  type="button"
                  className={`scout-view-mode-btn ${resultsViewMode === 'GRID' ? 'active' : ''}`}
                  onClick={() => setResultsViewMode('GRID')}
                  title="Cards View (Visual scouting cards)"
                  aria-label="Cards View"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  className={`scout-view-mode-btn ${resultsViewMode === 'TABLE' ? 'active' : ''}`}
                  onClick={() => setResultsViewMode('TABLE')}
                  title="Table View (Dense analytical list)"
                  aria-label="Table View"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  <span>Table</span>
                </button>
              </div>

              {pagination && pagination.total > 0 && (
                <div className="scout-b2b-page-indicator">
                  Page {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
                </div>
              )}
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-800 animate-slideUp">
              <span className="text-emerald-400">✓</span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* 4. Player Results View (Cards Grid vs High-Density Table) */}
          {resultsViewMode === 'GRID' ? (
            <PlayerCardGrid
              players={players}
              loading={loading}
              onPlayerSelect={handlePlayerSelect}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <PlayerTable
              players={players}
              loading={loading}
              onPlayerSelect={handlePlayerSelect}
              onResetFilters={handleResetFilters}
              onAddToShortlist={(player) => setShortlistTargetPlayer(player)}
            />
          )}

          {/* Add to Shortlist Modal for Table & Global Quick-Add */}
          <AddToShortlistModal
            isOpen={!!shortlistTargetPlayer}
            onClose={() => setShortlistTargetPlayer(null)}
            player={shortlistTargetPlayer}
            onSuccess={(shortlistName) => {
              showToast(`Added ${shortlistTargetPlayer?.fullName || 'player'} to "${shortlistName}"`);
            }}
          />

          {/* 5. Pagination Controls */}
          <PlayerPagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

