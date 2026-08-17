import React from 'react';
import type { PlayerFilterParams } from '../../types/player.types';
import type { CompetitionTeamItem } from '../../types/competition.types';

interface PlayerComparisonCandidateFiltersProps {
  filters: PlayerFilterParams;
  teams: CompetitionTeamItem[];
  onFilterChange: (field: keyof PlayerFilterParams, value: string | number) => void;
  onResetFilters: () => void;
}

export const PlayerComparisonCandidateFilters: React.FC<PlayerComparisonCandidateFiltersProps> = ({
  filters,
  teams,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="player-filters-card" style={{ marginBottom: '20px' }}>
      <div className="filters-header">
        <span className="filters-title">🔍 Candidate Filters</span>
        <button
          type="button"
          className="scout-btn scout-btn-secondary scout-btn-sm"
          onClick={onResetFilters}
        >
          Reset Filters
        </button>
      </div>

      {/* Row 1: Club, Position, Preferred Foot */}
      <div className="filters-grid-4">
        {/* 1. Club Dropdown */}
        <div className="input-group">
          <label className="input-label">Club</label>
          <select
            className="scout-select"
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

        {/* 2. Position Dropdown */}
        <div className="input-group">
          <label className="input-label">Position</label>
          <select
            className="scout-select"
            value={filters.position || ''}
            onChange={(e) => onFilterChange('position', e.target.value)}
          >
            <option value="">All Positions</option>
            <option value="GK">GK - Goalkeeper</option>
            <option value="CB">CB - Centre Back</option>
            <option value="LB">LB - Left Back</option>
            <option value="RB">RB - Right Back</option>
            <option value="DM">DM - Defensive Midfield</option>
            <option value="CM">CM - Central Midfield</option>
            <option value="AM">AM - Attacking Midfield</option>
            <option value="LW">LW - Left Wing</option>
            <option value="RW">RW - Right Wing</option>
            <option value="ST">ST - Striker</option>
          </select>
        </div>

        {/* 3. Preferred Foot Dropdown */}
        <div className="input-group">
          <label className="input-label">Preferred Foot</label>
          <select
            className="scout-select"
            value={filters.preferredFoot || ''}
            onChange={(e) => onFilterChange('preferredFoot', e.target.value)}
          >
            <option value="">Any Foot</option>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        {/* 4. Nationality */}
        <div className="input-group">
          <label className="input-label">Nationality</label>
          <input
            type="text"
            className="scout-input"
            placeholder="e.g. Brazil, England..."
            value={filters.nationality || ''}
            onChange={(e) => onFilterChange('nationality', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Min Age, Max Age, Min Height, Max Height */}
      <div className="filters-grid-4" style={{ marginTop: '12px' }}>
        <div className="input-group">
          <label className="input-label">Min Age</label>
          <input
            type="number"
            className="scout-input"
            placeholder="e.g. 18"
            value={filters.minAge || ''}
            onChange={(e) => onFilterChange('minAge', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Max Age</label>
          <input
            type="number"
            className="scout-input"
            placeholder="e.g. 25"
            value={filters.maxAge || ''}
            onChange={(e) => onFilterChange('maxAge', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Min Height (cm)</label>
          <input
            type="number"
            className="scout-input"
            placeholder="e.g. 175"
            value={filters.minHeightCm || ''}
            onChange={(e) => onFilterChange('minHeightCm', e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Max Height (cm)</label>
          <input
            type="number"
            className="scout-input"
            placeholder="e.g. 190"
            value={filters.maxHeightCm || ''}
            onChange={(e) => onFilterChange('maxHeightCm', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
