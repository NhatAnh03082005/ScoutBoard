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
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        marginBottom: '24px',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🌐</span>
          <span>COMPARISON SCOPE & CONTEXT</span>
        </div>

        {/* Active Context Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ACTIVE CONTEXT:
          </span>
          <span
            style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {selectedSeason?.seasonCode || 'Season'} ·{' '}
            {scope === 'ALL' ? 'All Competitions' : selectedCompetition?.name || 'Select Competition'}
          </span>
        </div>
      </div>

      {/* Grid Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          alignItems: 'flex-end',
        }}
      >
        {/* Modernized Scope Selector (Segmented Pill Switch) */}
        <div>
          <label
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
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
              background: '#f1f5f9',
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              gap: '4px',
              width: '100%',
              boxSizing: 'border-box',
              height: '40px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => onScopeChange('COMPETITION')}
              style={{
                flex: 1,
                height: '100%',
                background: scope === 'COMPETITION' ? '#ffffff' : 'transparent',
                color: scope === 'COMPETITION' ? '#2563eb' : '#64748b',
                fontWeight: scope === 'COMPETITION' ? 900 : 700,
                boxShadow: scope === 'COMPETITION' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                padding: '0 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
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
              onClick={() => onScopeChange('ALL')}
              style={{
                flex: 1,
                height: '100%',
                background: scope === 'ALL' ? '#ffffff' : 'transparent',
                color: scope === 'ALL' ? '#2563eb' : '#64748b',
                fontWeight: scope === 'ALL' ? 900 : 700,
                boxShadow: scope === 'ALL' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                padding: '0 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
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
        <div>
          <label
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '6px',
              display: 'block',
            }}
          >
            SEASON
          </label>
          <select
            value={seasonId}
            onChange={(e) => onSeasonChange(e.target.value)}
            style={{
              height: '40px',
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
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
            <label
              style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              COMPETITION
            </label>
            <select
              value={competitionId}
              onChange={(e) => onCompetitionChange(e.target.value)}
              style={{
                height: '40px',
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
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
