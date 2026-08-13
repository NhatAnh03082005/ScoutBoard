import React, { useState, useEffect } from 'react';
import type { PlayerItem, PlayerFilterParams, PaginationMetadata } from '../types/player.types';
import type { CompetitionItem, CompetitionTeamItem } from '../types/competition.types';
import { searchPlayersApi } from '../services/player.service';
import { getCompetitionsApi, getCurrentTeamsByCompetitionApi } from '../services/competition.service';
import { PlayerFilters } from '../components/player/PlayerFilters';
import { PlayerTable } from '../components/player/PlayerTable';
import { PlayerPagination } from '../components/player/PlayerPagination';

// Helper to parse numeric inputs cleanly and avoid Number("") === 0 pitfalls
const parseNumericParam = (val?: number | string | null): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const parsed = typeof val === 'number' ? val : Number(val);
  return isNaN(parsed) ? undefined : parsed;
};

export const PlayerSearchPage: React.FC = () => {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      .then((response) => {
        setPlayers(response.items);
        setPagination(response.pagination);
      })
      .catch((err: any) => {
        setError(err.message || 'Không thể tải danh sách cầu thủ từ backend');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial fetch: Load Competitions list & Load initial players on mount
  useEffect(() => {
    getCompetitionsApi()
      .then((compsList) => {
        setCompetitions(compsList);
      })
      .catch((err: any) => {
        console.error('Không thể tải danh sách giải đấu:', err);
      });

    fetchPlayersData(1, {}, '');
  }, []);

  // Handler when user selects a Competition
  const handleCompetitionChange = (competitionId: string) => {
    const updatedFilters = {
      ...filters,
      competitionId,
      currentTeamId: '',
    };

    setFilters(updatedFilters);
    setTeams([]);

    if (competitionId) {
      setLoadingTeams(true);
      getCurrentTeamsByCompetitionApi(competitionId)
        .then((teamsList) => {
          setTeams(teamsList);
        })
        .catch((err: any) => {
          setError(err.message || 'Không thể tải danh sách câu lạc bộ');
        })
        .finally(() => {
          setLoadingTeams(false);
        });
    }

    // Reset to page 1 and fetch players with updated competition
    fetchPlayersData(1, updatedFilters);
  };

  // Handler when user selects a Club
  const handleTeamChange = (teamId: string) => {
    const updatedFilters = {
      ...filters,
      currentTeamId: teamId,
    };

    setFilters(updatedFilters);
    // Reset to page 1 and fetch players with updated club
    fetchPlayersData(1, updatedFilters);
  };

  // Handler for simple filters (position, preferredFoot, nationality, minAge, maxAge, minHeightCm, maxHeightCm)
  const handleFilterChange = (field: keyof PlayerFilterParams, value: any) => {
    const updatedFilters = {
      ...filters,
      [field]: value,
    };

    setFilters(updatedFilters);
    // Reset to page 1 and fetch players with updated filter
    fetchPlayersData(1, updatedFilters);
  };

  // Form submit handler when user clicks Search or presses Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKeyword = searchInput.trim();
    setAppliedSearch(trimmedKeyword);
    fetchPlayersData(1, {}, trimmedKeyword);
  };

  // Pagination page change handler
  const handlePageChange = (page: number) => {
    fetchPlayersData(page);
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
      <PlayerTable players={players} />

      {/* 5. Pagination */}
      <PlayerPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
