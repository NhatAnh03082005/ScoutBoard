import React from 'react';
import type { PlayerFilterParams } from '../../types/player.types';
import type { CompetitionTeamItem } from '../../types/competition.types';
import { getPositionRoleInfo } from '../../utils/position.utils';

interface PlayerComparisonCandidateFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  searchLoading?: boolean;
  filters: PlayerFilterParams;
  teams: CompetitionTeamItem[];
  compatiblePositions: string[];
  onFilterChange: (field: keyof PlayerFilterParams, value: any) => void;
  onResetFilters: () => void;
}

export const PlayerComparisonCandidateFilters: React.FC<PlayerComparisonCandidateFiltersProps> = ({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  searchLoading = false,
  filters,
  teams,
  compatiblePositions,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="scout-b2b-control-card">
      {/* 1. TOP ROW: Search Input + Icon Action Buttons */}
      <form onSubmit={onSearchSubmit} className="scout-b2b-search-row">
        <div className="scout-b2b-search-input-wrapper">
          <span className="scout-b2b-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="scout-b2b-search-input"
            placeholder="Search candidate player by name... (e.g., Palmer, Rodri, Gabriel, Pedri...)"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
        </div>

        {/* Action Icon Buttons */}
        <div className="scout-b2b-search-actions">
          {/* Search Button */}
          <button
            type="submit"
            className="scout-b2b-icon-btn scout-b2b-btn-search"
            disabled={searchLoading}
            title="Search (Enter)"
            aria-label="Search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            className="scout-b2b-icon-btn scout-b2b-btn-clear"
            onClick={onResetFilters}
            title="Clear all filters and search input"
            aria-label="Clear filters"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Clear</span>
          </button>
        </div>
      </form>

      {/* 2. BOTTOM ROW: High-Density Filter Grid matching PlayerSearchPage */}
      <div className="scout-b2b-filters-grid">
        {/* 1. Club Dropdown */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Club</label>
          <select
            className="scout-b2b-select"
            value={filters.currentTeamId || ''}
            onChange={(e) => onFilterChange('currentTeamId', e.target.value)}
          >
            <option value="">All Clubs</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.shortName || team.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Position Dropdown (Restricted strictly to Player A's compatible positions) */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Position</label>
          <select
            className="scout-b2b-select"
            value={filters.position || ''}
            onChange={(e) => onFilterChange('position', e.target.value)}
          >
            <option value="">
              {compatiblePositions.length > 0
                ? `All (${compatiblePositions.join(', ')})`
                : 'All Compatible'}
            </option>
            {compatiblePositions.map((pos) => {
              const roleInfo = getPositionRoleInfo(pos);
              return (
                <option key={pos} value={pos}>
                  {pos} - {roleInfo.label || pos}
                </option>
              );
            })}
          </select>
        </div>

        {/* 3. Preferred Foot Dropdown */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Preferred Foot</label>
          <select
            className="scout-b2b-select"
            value={filters.preferredFoot || ''}
            onChange={(e) => onFilterChange('preferredFoot', e.target.value)}
          >
            <option value="">Any Foot</option>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        {/* 4. Nationality Input */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Nationality</label>
          <input
            type="text"
            className="scout-b2b-input"
            placeholder="e.g., Brazil, England..."
            value={filters.nationality || ''}
            onChange={(e) => onFilterChange('nationality', e.target.value)}
          />
        </div>

        {/* 5. Age Range (Grouped Dual Input) */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Age</label>
          <div className="scout-b2b-grouped-input">
            <input
              type="number"
              placeholder="Min"
              min={14}
              max={50}
              value={filters.minAge || ''}
              onChange={(e) => onFilterChange('minAge', e.target.value)}
              className="scout-b2b-inner-input"
            />
            <span className="scout-b2b-input-divider">-</span>
            <input
              type="number"
              placeholder="Max"
              min={14}
              max={50}
              value={filters.maxAge || ''}
              onChange={(e) => onFilterChange('maxAge', e.target.value)}
              className="scout-b2b-inner-input"
            />
          </div>
        </div>

        {/* 6. Height Range (Grouped Dual Input) */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Height (cm)</label>
          <div className="scout-b2b-grouped-input">
            <input
              type="number"
              placeholder="Min"
              min={150}
              max={220}
              value={filters.minHeightCm || ''}
              onChange={(e) => onFilterChange('minHeightCm', e.target.value)}
              className="scout-b2b-inner-input"
            />
            <span className="scout-b2b-input-divider">-</span>
            <input
              type="number"
              placeholder="Max"
              min={150}
              max={220}
              value={filters.maxHeightCm || ''}
              onChange={(e) => onFilterChange('maxHeightCm', e.target.value)}
              className="scout-b2b-inner-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
