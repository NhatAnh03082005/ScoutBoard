import React, { useState } from 'react';
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
  availablePositions?: string[];
  loadingTeams: boolean;
  onFilterChange: (field: keyof PlayerFilterParams, value: any) => void;
  onCompetitionChange: (competitionId: string) => void;
  onTeamChange: (teamId: string) => void;
  onResetFilters: () => void;
  onClearSearch?: () => void;
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre Back',
  LB: 'Left Back',
  RB: 'Right Back',
  LWB: 'Left Wing Back',
  RWB: 'Right Wing Back',
  CDM: 'Defensive Midfield',
  CM: 'Central Midfield',
  LM: 'Left Midfield',
  RM: 'Right Midfield',
  CAM: 'Attacking Midfield',
  LW: 'Left Wing',
  RW: 'Right Wing',
  CF: 'Centre Forward',
  ST: 'Striker',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

export const POSITION_ORDER = [
  'GK',
  'CB',
  'LB',
  'RB',
  'LWB',
  'RWB',
  'CDM',
  'CM',
  'LM',
  'RM',
  'CAM',
  'LW',
  'RW',
  'CF',
  'ST',
];

export function sortPositions(positions: string[]): string[] {
  return [...positions].sort((a, b) => {
    const idxA = POSITION_ORDER.indexOf(a);
    const idxB = POSITION_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export const PlayerFilters: React.FC<PlayerFiltersProps> = ({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  searchLoading = false,
  filters,
  competitions,
  teams,
  availablePositions,
  loadingTeams,
  onFilterChange,
  onCompetitionChange,
  onTeamChange,
  onResetFilters,
  onClearSearch,
}) => {
  const [isAdvancedManualOpen, setIsAdvancedManualOpen] = useState<boolean>(false);

  // Check if any advanced filters are active
  const hasActiveAdvanced = Boolean(
    filters.minAge ||
    filters.maxAge ||
    filters.minHeightCm ||
    filters.maxHeightCm ||
    filters.minWeightKg ||
    filters.maxWeightKg
  );

  const isAdvancedVisible = isAdvancedManualOpen || hasActiveAdvanced;

  // Active filter count for badge
  const advancedFilterCount = [
    Boolean(filters.minAge || filters.maxAge),
    Boolean(filters.minHeightCm || filters.maxHeightCm),
    Boolean(filters.minWeightKg || filters.maxWeightKg),
  ].filter(Boolean).length;

  // Check which competition & club are selected for readable chips
  const selectedComp = competitions.find((c) => c.id === filters.competitionId);
  const selectedTeam = teams.find((t) => t.id === filters.currentTeamId);

  const hasAnyFilterActive = Boolean(
    filters.competitionId ||
    filters.currentTeamId ||
    filters.position ||
    (filters.nationality && filters.nationality.trim()) ||
    hasActiveAdvanced
  );

  return (
    <div className="scout-b2b-control-card">
      {/* 1. TOP ROW: Search Input with Inline Clear + Search & Reset Actions */}
      <form onSubmit={onSearchSubmit} className="scout-b2b-search-row">
        <div className="scout-b2b-search-input-wrapper scout-search-input-box">
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
          {searchInput && (
            <button
              type="button"
              className="scout-search-clear-inline"
              onClick={() => {
                onSearchInputChange('');
                if (onClearSearch) {
                  onClearSearch();
                }
              }}
              title="Clear search query"
              aria-label="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="scout-b2b-search-actions">
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

          <button
            type="button"
            className="scout-b2b-icon-btn scout-b2b-btn-clear"
            onClick={onResetFilters}
            title="Reset all filters and search input"
            aria-label="Reset all filters"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Reset All</span>
          </button>
        </div>
      </form>

      {/* 2. PRIMARY FILTERS TIER (Competition, Club, Position, Nationality + Advanced Toggle) */}
      <div className="scout-filter-tier-primary" style={{ marginTop: '14px' }}>
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
                ? 'Loading clubs...'
                : 'All Clubs'}
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
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
            {sortPositions(
              Array.from(new Set([...POSITION_ORDER, ...(availablePositions || [])]))
            ).map((pos) => (
              <option key={pos} value={pos}>
                {pos} {POSITION_LABELS[pos] ? `- ${POSITION_LABELS[pos]}` : ''}
              </option>
            ))}
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

        {/* 5. Advanced Filters Toggle Button */}
        <div className="scout-b2b-filter-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className={`scout-advanced-toggle-btn ${hasActiveAdvanced ? 'has-active' : ''}`}
            onClick={() => setIsAdvancedManualOpen((prev) => !prev)}
            aria-expanded={isAdvancedVisible}
            title="Toggle Age, Height, Weight filters"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>Physical Filters {advancedFilterCount > 0 ? `(${advancedFilterCount})` : ''}</span>
            <span>{isAdvancedVisible ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {/* 3. ADVANCED SECONDARY FILTERS (Progressive Disclosure: Age, Height, Weight) */}
      {isAdvancedVisible && (
        <div className="scout-filter-tier-advanced">
          {/* Age Range */}
          <div className="scout-b2b-filter-group">
            <label className="scout-b2b-label">Age Range (years)</label>
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

          {/* Height Range */}
          <div className="scout-b2b-filter-group">
            <label className="scout-b2b-label">Height (cm)</label>
            <div className="scout-b2b-grouped-input">
              <input
                type="number"
                placeholder="Min (150)"
                min={150}
                max={220}
                value={filters.minHeightCm || ''}
                onChange={(e) => onFilterChange('minHeightCm', e.target.value)}
                className="scout-b2b-inner-input"
              />
              <span className="scout-b2b-input-divider">-</span>
              <input
                type="number"
                placeholder="Max (220)"
                min={150}
                max={220}
                value={filters.maxHeightCm || ''}
                onChange={(e) => onFilterChange('maxHeightCm', e.target.value)}
                className="scout-b2b-inner-input"
              />
            </div>
          </div>

          {/* Weight Range */}
          <div className="scout-b2b-filter-group">
            <label className="scout-b2b-label">Weight (kg)</label>
            <div className="scout-b2b-grouped-input">
              <input
                type="number"
                placeholder="Min (40)"
                min={40}
                max={150}
                value={filters.minWeightKg || ''}
                onChange={(e) => onFilterChange('minWeightKg', e.target.value)}
                className="scout-b2b-inner-input"
              />
              <span className="scout-b2b-input-divider">-</span>
              <input
                type="number"
                placeholder="Max (150)"
                min={40}
                max={150}
                value={filters.maxWeightKg || ''}
                onChange={(e) => onFilterChange('maxWeightKg', e.target.value)}
                className="scout-b2b-inner-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVE FILTER CHIPS ROW (Contextual Feedback) */}
      {hasAnyFilterActive && (
        <div className="scout-active-chips-bar">
          <span className="scout-chips-label">Active Filters:</span>

          {selectedComp && (
            <span className="scout-filter-chip">
              <span>{selectedComp.name}</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => onCompetitionChange('')}
                title="Remove competition filter"
              >
                ✕
              </button>
            </span>
          )}

          {selectedTeam && (
            <span className="scout-filter-chip">
              <span>{selectedTeam.name}</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => onTeamChange('')}
                title="Remove club filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.position && (
            <span className="scout-filter-chip">
              <span>{filters.position}</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => onFilterChange('position', '')}
                title="Remove position filter"
              >
                ✕
              </button>
            </span>
          )}

          {filters.nationality && filters.nationality.trim() && (
            <span className="scout-filter-chip">
              <span>{filters.nationality.trim()}</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => onFilterChange('nationality', '')}
                title="Remove nationality filter"
              >
                ✕
              </button>
            </span>
          )}

          {(filters.minAge || filters.maxAge) && (
            <span className="scout-filter-chip">
              <span>Age: {filters.minAge || '14'} - {filters.maxAge || '50'}</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => {
                  onFilterChange('minAge', '');
                  onFilterChange('maxAge', '');
                }}
                title="Remove age range filter"
              >
                ✕
              </button>
            </span>
          )}

          {(filters.minHeightCm || filters.maxHeightCm) && (
            <span className="scout-filter-chip">
              <span>Height: {filters.minHeightCm || '150'} - {filters.maxHeightCm || '220'}cm</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => {
                  onFilterChange('minHeightCm', '');
                  onFilterChange('maxHeightCm', '');
                }}
                title="Remove height filter"
              >
                ✕
              </button>
            </span>
          )}

          {(filters.minWeightKg || filters.maxWeightKg) && (
            <span className="scout-filter-chip">
              <span>Weight: {filters.minWeightKg || '40'} - {filters.maxWeightKg || '150'}kg</span>
              <button
                type="button"
                className="scout-filter-chip-remove"
                onClick={() => {
                  onFilterChange('minWeightKg', '');
                  onFilterChange('maxWeightKg', '');
                }}
                title="Remove weight filter"
              >
                ✕
              </button>
            </span>
          )}

          <button
            type="button"
            className="scout-chips-clear-all"
            onClick={onResetFilters}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
