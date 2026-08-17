import React, { useState, useEffect } from 'react';
import type {
  PlayerItem,
  PlayerDetail,
  PlayerSeasonStatisticItem,
  PlayerFilterParams,
  PaginationMetadata,
  ComparisonScopeType,
} from '../types/player.types';
import type { CompetitionItem, CompetitionTeamItem } from '../types/competition.types';
import { searchPlayersApi } from '../services/player.service';
import { getCompetitionsApi, getCurrentTeamsByCompetitionApi } from '../services/competition.service';
import { PlayerFilters } from '../components/player/PlayerFilters';
import { PlayerTable } from '../components/player/PlayerTable';
import { PlayerPagination } from '../components/player/PlayerPagination';
import { PlayerDetailPage } from './PlayerDetailPage';
import { PlayerComparisonSetupPage } from './PlayerComparisonSetupPage';
import { PlayerComparisonPage } from './PlayerComparisonPage';

type ViewMode = 'SEARCH' | 'DETAIL' | 'COMPARISON_SETUP' | 'COMPARISON_VIEW';

// Helper to parse numeric inputs cleanly and avoid Number("") === 0 pitfalls
const parseNumericParam = (val?: number | string | null): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = typeof val === 'number' ? val : Number(val);
  return isNaN(parsed) ? undefined : parsed;
};

export const PlayerSearchPage: React.FC = () => {
  // Navigation View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('SEARCH');

  // Search Results & Pagination
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Player for Detail View
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

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
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);

  // Controlled input value for typing search keyword
  const [searchInput, setSearchInput] = useState<string>('');
  // Applied search keyword currently active for API queries
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  const [filters, setFilters] = useState<PlayerFilterParams>({
    competitionId: '',
    currentTeamId: '',
    position: '',
    preferredFoot: '',
    nationality: '',
    minAge: '',
    maxAge: '',
    minHeightCm: '',
    maxHeightCm: '',
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

    // Parse numeric age and height parameters
    const minAgeNum = parseNumericParam(currentFilters.minAge);
    const maxAgeNum = parseNumericParam(currentFilters.maxAge);
    const minHeightNum = parseNumericParam(currentFilters.minHeightCm);
    const maxHeightNum = parseNumericParam(currentFilters.maxHeightCm);

    // Range Validation Checks
    if (minAgeNum !== undefined && maxAgeNum !== undefined && minAgeNum > maxAgeNum) {
      setError('Minimum age cannot be greater than maximum age.');
      return;
    }

    if (minHeightNum !== undefined && maxHeightNum !== undefined && minHeightNum > maxHeightNum) {
      setError('Minimum height cannot be greater than maximum height.');
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
      preferredFoot: currentFilters.preferredFoot ? currentFilters.preferredFoot : undefined,
      nationality: currentFilters.nationality && currentFilters.nationality.trim() !== '' ? currentFilters.nationality.trim() : undefined,
      minAge: minAgeNum,
      maxAge: maxAgeNum,
      minHeightCm: minHeightNum,
      maxHeightCm: maxHeightNum,
    };

    searchPlayersApi(queryParams)
      .then((data) => {
        setPlayers(data.items);
        setPagination(data.pagination);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to fetch players');
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
    setTeams([]);
    fetchPlayersData(1, defaultFilters, '');
  };

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

  // 4. Render Master Search View
  return (
    <div className="player-search-page">
      {/* 1. Page Title */}
      <div className="scout-header" style={{ marginBottom: '16px', textAlign: 'left' }}>
        <h2 className="scout-title" style={{ fontSize: '26px' }}>
          Player Search
        </h2>
        <p className="scout-subtitle">
          Find and evaluate football players.
        </p>
      </div>

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
          ⌛ Loading players...
        </div>
      )}

      {/* 2. Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="search-form" style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="scout-input"
            placeholder="Search by player name... (e.g. Saka, Gabriel)"
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

      {/* 3. Filters */}
      <PlayerFilters
        filters={filters}
        competitions={competitions}
        teams={teams}
        loadingTeams={loadingTeams}
        onFilterChange={handleFilterChange}
        onCompetitionChange={handleCompetitionChange}
        onTeamChange={handleTeamChange}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Player Table */}
      <PlayerTable players={players} onPlayerSelect={handlePlayerSelect} />

      {/* 5. Pagination */}
      <PlayerPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
