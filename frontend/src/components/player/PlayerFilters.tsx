import React from 'react';
import type { PlayerFilterParams } from '../../types/player.types';
import type { CompetitionItem, CompetitionTeamItem } from '../../types/competition.types';

interface PlayerFiltersProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  searchLoading?: boolean;
  filters: PlayerFilterParams;
  competitions: CompetitionItem[];
  teams: CompetitionTeamItem[];
  loadingTeams: boolean;
  onFilterChange: (field: keyof PlayerFilterParams, value: any) => void;
  onCompetitionChange: (competitionId: string) => void;
  onTeamChange: (teamId: string) => void;
  onResetFilters: () => void;
}

export const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  searchLoading = false,
  filters,
  competitions,
  teams,
  loadingTeams,
  onFilterChange,
  onCompetitionChange,
  onTeamChange,
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
            placeholder="Search player by name... (e.g., Saka, Gabriel, Haaland, Pedri...)"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
        </div>

        {/* Action Icon Buttons */}
        <div className="scout-b2b-search-actions">
          {/* Search Button (Turns Blue on Hover/Normal) */}
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

          {/* Clear Button (Turns Red on Hover) */}
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

      {/* 2. BOTTOM ROW: High-Density 7-Column Filter Grid */}
      <div className="scout-b2b-filters-grid">
        {/* 1. Competition Dropdown */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Competition</label>
          <select
            className="scout-b2b-select"
            value={filters.competitionId || ''}
            onChange={(e) => onCompetitionChange(e.target.value)}
          >
            <option value="">All Competitions</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} {comp.country ? `(${comp.country})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Club Dropdown */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Club</label>
          <select
            className="scout-b2b-select"
            value={filters.currentTeamId || ''}
            disabled={!filters.competitionId || loadingTeams}
            onChange={(e) => onTeamChange(e.target.value)}
          >
            <option value="">
              {!filters.competitionId
                ? 'Select competition first'
                : loadingTeams
                ? 'Loading...'
                : 'All Clubs'}
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.shortName || team.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Position Dropdown */}
        <div className="scout-b2b-filter-group">
          <label className="scout-b2b-label">Position</label>
          <select
            className="scout-b2b-select"
            value={filters.position || ''}
            onChange={(e) => onFilterChange('position', e.target.value)}
          >
            <option value="">All Positions</option>
            <option value="GK">GK - Goalkeeper</option>
            <option value="CB">CB - Centre Back</option>
            <option value="LB">LB - Left Back</option>
            <option value="RB">RB - Right Back</option>
            <option value="LWB">LWB - Left Wing Back</option>
            <option value="RWB">RWB - Right Wing Back</option>
            <option value="CDM">CDM - Defensive Midfield</option>
            <option value="CM">CM - Central Midfield</option>
            <option value="CAM">CAM - Attacking Midfield</option>
            <option value="LM">LM - Left Midfield</option>
            <option value="RM">RM - Right Midfield</option>
            <option value="ST">ST - Striker</option>
            <option value="CF">CF - Centre Forward</option>
            <option value="LW">LW - Left Wing</option>
            <option value="RW">RW - Right Wing</option>
          </select>
        </div>

        {/* 4. Preferred Foot Dropdown */}
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

        {/* 5. Nationality Input */}
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

        {/* 6. Age Range (Grouped Dual Input) */}
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

        {/* 7. Height Range (Grouped Dual Input) */}
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
