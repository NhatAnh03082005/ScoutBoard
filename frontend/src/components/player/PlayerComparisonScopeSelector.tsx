import React from 'react';
import type { ComparisonScopeType, PlayerSeasonStatisticItem } from '../../types/player.types';

interface PlayerComparisonScopeSelectorProps {
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId: string;
  seasonStatistics: PlayerSeasonStatisticItem[];
  onScopeChange: (newScope: ComparisonScopeType) => void;
  onSeasonChange: (newSeasonId: string) => void;
  onCompetitionChange: (newCompId: string) => void;
}

export const PlayerComparisonScopeSelector: React.FC<PlayerComparisonScopeSelectorProps> = ({
  scope,
  seasonId,
  competitionId,
  seasonStatistics,
  onScopeChange,
  onSeasonChange,
  onCompetitionChange,
}) => {
  // Extract unique seasons from current player's statistics
  const seasonOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; seasonCode: string; isCurrent: boolean }>();
    seasonStatistics.forEach((stat) => {
      if (stat.season && stat.season.id && !map.has(stat.season.id)) {
        map.set(stat.season.id, {
          id: stat.season.id,
          seasonCode: stat.season.seasonCode || 'N/A',
          isCurrent: stat.season.isCurrent,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return b.seasonCode.localeCompare(a.seasonCode);
    });
  }, [seasonStatistics]);

  // Extract available competitions for the currently selected season
  const competitionOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    seasonStatistics
      .filter((stat) => stat.season && stat.season.id === seasonId)
      .forEach((stat) => {
        if (stat.competition && stat.competition.id && !map.has(stat.competition.id)) {
          map.set(stat.competition.id, {
            id: stat.competition.id,
            name: stat.competition.name,
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [seasonStatistics, seasonId]);

  const selectedSeason = seasonOptions.find((s) => s.id === seasonId);
  const selectedCompetition = competitionOptions.find((c) => c.id === competitionId);

  return (
    <div
      className="player-filters-card"
      style={{
        padding: '20px',
        marginBottom: '24px',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌐</span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Comparison Scope & Context
          </h3>
        </div>

        {/* Active Context Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Active Context:</span>
          <span
            className="role-pill"
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontWeight: 600,
            }}
          >
            {selectedSeason?.seasonCode || 'Season'} ·{' '}
            {scope === 'ALL' ? 'All Competitions' : selectedCompetition?.name || 'Select Competition'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
        {/* Scope Radio Mode */}
        <div>
          <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
            Phạm Vi So Sánh (Scope)
          </label>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: scope === 'COMPETITION' ? '#38bdf8' : '#cbd5e1',
                fontWeight: scope === 'COMPETITION' ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="comparisonScope"
                value="COMPETITION"
                checked={scope === 'COMPETITION'}
                onChange={() => onScopeChange('COMPETITION')}
                style={{ accentColor: '#38bdf8' }}
              />
              Specific Competition
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: scope === 'ALL' ? '#38bdf8' : '#cbd5e1',
                fontWeight: scope === 'ALL' ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="comparisonScope"
                value="ALL"
                checked={scope === 'ALL'}
                onChange={() => onScopeChange('ALL')}
                style={{ accentColor: '#38bdf8' }}
              />
              All Competitions (Aggregate)
            </label>
          </div>
        </div>

        {/* Season Selector */}
        <div>
          <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>
            Mùa Giải (Season)
          </label>
          <select
            className="scout-select"
            value={seasonId}
            onChange={(e) => onSeasonChange(e.target.value)}
            style={{ width: '100%' }}
          >
            {seasonOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.seasonCode} {s.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Competition Selector (Only in COMPETITION scope) */}
        {scope === 'COMPETITION' && (
          <div>
            <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>
              Giải Đấu (Competition)
            </label>
            <select
              className="scout-select"
              value={competitionId}
              onChange={(e) => onCompetitionChange(e.target.value)}
              style={{ width: '100%' }}
            >
              {competitionOptions.length === 0 ? (
                <option value="">No competitions available</option>
              ) : (
                competitionOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏆 {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
