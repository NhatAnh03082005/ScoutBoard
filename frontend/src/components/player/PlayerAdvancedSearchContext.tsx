import React, { useState, useEffect, useMemo } from 'react';
import type {
  GroupNode,
  PlayerPosition,
  PlayerQueryScope,
} from '../../types/player.types';
import type { CompetitionItem, CompetitionTeamItem } from '../../types/competition.types';
import {
  getCurrentTeamsByCompetitionApi,
  getAllTeamsApi,
} from '../../services/competition.service';
import {
  getPositionPerformanceMetrics,
  POSITION_PERFORMANCE_METRIC_KEYS,
  type CategorizedMetric,
} from '../../types/player-query-metrics';
import {
  type StatisticRangeRow,
  type TopNConfig,
  validateRangeRow,
  buildSearchQueryNode,
  buildSearchScope,
  CompetitionPickerModal,
  ClubPickerModal,
  PositionPickerSection,
  StatisticRangesSection,
  TopNSection,
} from './search-context';

export type { StatisticRangeRow, TopNConfig };
export { TOP_N_PRESETS } from './search-context';

export interface PlayerAdvancedSearchContextProps {
  competitions: CompetitionItem[];
  onExecute: (
    query: GroupNode,
    scope?: PlayerQueryScope,
  ) => void;
  loading?: boolean;
  error?: string | null;
  initialContext?: {
    competitionIds?: string[];
    clubIds?: string[];
    position?: PlayerPosition | null;
  };
}

export const PlayerAdvancedSearchContext: React.FC<
  PlayerAdvancedSearchContextProps
> = ({
  competitions,
  onExecute,
  loading = false,
  error,
  initialContext,
}) => {
  // Context state
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<string[]>(
    initialContext?.competitionIds || [],
  );
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>(
    initialContext?.clubIds || [],
  );
  const [selectedPosition, setSelectedPosition] = useState<PlayerPosition | null>(
    initialContext?.position || null,
  );

  // Statistic Range Rows & Top N Config
  const [statisticRows, setStatisticRows] = useState<StatisticRangeRow[]>([]);
  const [topNConfig, setTopNConfig] = useState<TopNConfig>({
    enabled: false,
    preset: 10,
    customValue: '10',
    metricKey: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  // Club dataset state
  const [allClubs, setAllClubs] = useState<CompetitionTeamItem[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<CompetitionTeamItem[]>([]);
  const [loadingClubs, setLoadingClubs] = useState<boolean>(false);

  // Modal selector dialog states
  const [showCompModal, setShowCompModal] = useState<boolean>(false);
  const [showClubModal, setShowClubModal] = useState<boolean>(false);

  // 1. Initial load: fetch all clubs in system
  useEffect(() => {
    let mounted = true;
    getAllTeamsApi()
      .then((teams) => {
        if (mounted) {
          setAllClubs(teams);
        }
      })
      .catch((err) => {
        console.warn('Failed to load global clubs list:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch/filter clubs whenever selected competitions change
  useEffect(() => {
    let mounted = true;
    if (selectedCompetitionIds.length === 0) {
      setFilteredClubs(allClubs);
      return;
    }

    setLoadingClubs(true);
    Promise.all(
      selectedCompetitionIds.map((id) =>
        getCurrentTeamsByCompetitionApi(id).catch(() => []),
      ),
    )
      .then((results) => {
        if (!mounted) return;
        const merged = new Map<string, CompetitionTeamItem>();
        results.flat().forEach((team) => {
          const id = (team as any).id || (team as any).teamId;
          if (id && !merged.has(id)) {
            merged.set(id, team);
          }
        });
        setFilteredClubs(Array.from(merged.values()));
      })
      .finally(() => {
        if (mounted) setLoadingClubs(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCompetitionIds, allClubs]);

  // Available performance metrics for currently selected position
  const positionPerformanceMetrics = useMemo<CategorizedMetric[]>(() => {
    if (!selectedPosition) return [];
    return getPositionPerformanceMetrics(selectedPosition);
  }, [selectedPosition]);

  // Detect any club-competition dependency mismatch
  const mismatchedClubs = useMemo(() => {
    if (selectedCompetitionIds.length === 0 || selectedClubIds.length === 0) {
      return [];
    }
    return selectedClubIds
      .map((id) =>
        allClubs.find((c) => ((c as any).id || (c as any).teamId) === id),
      )
      .filter((c): c is CompetitionTeamItem => !!c)
      .filter((club) => {
        const id = (club as any).id || (club as any).teamId;
        return !filteredClubs.some(
          (fc) => ((fc as any).id || (fc as any).teamId) === id,
        );
      });
  }, [selectedCompetitionIds, selectedClubIds, allClubs, filteredClubs]);

  // Position selection handler with stale metric cleanup
  const handleTogglePosition = (code: PlayerPosition) => {
    setLocalError(null);
    if (selectedPosition === code) {
      setSelectedPosition(null);
      setStatisticRows([]);
      setTopNConfig((prev) => ({ ...prev, enabled: false }));
    } else {
      setSelectedPosition(code);
      const newAllowed = new Set(POSITION_PERFORMANCE_METRIC_KEYS[code] || []);
      setStatisticRows((prev) =>
        prev.filter((r) => newAllowed.has(r.metricKey)),
      );
      setTopNConfig((prev) => {
        const nextMetrics = getPositionPerformanceMetrics(code);
        const validKey = newAllowed.has(prev.metricKey)
          ? prev.metricKey
          : nextMetrics[0]?.key || '';
        return {
          ...prev,
          metricKey: validKey,
          enabled: nextMetrics.length > 0 ? prev.enabled : false,
        };
      });
    }
  };

  // Grouped performance metrics for dropdown optgroups
  const groupedPerformanceMetrics = useMemo(() => {
    const groups: Record<string, CategorizedMetric[]> = {};
    for (const m of positionPerformanceMetrics) {
      const cat = m.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    return groups;
  }, [positionPerformanceMetrics]);

  // Statistic range handlers
  const handleAddStatisticRow = () => {
    if (!selectedPosition || positionPerformanceMetrics.length === 0) return;
    setLocalError(null);
    const used = new Set(statisticRows.map((r) => r.metricKey));
    const next =
      positionPerformanceMetrics.find((m) => !used.has(m.key)) ||
      positionPerformanceMetrics[0];

    setStatisticRows((prev) => [
      ...prev,
      {
        id: `stat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        metricKey: next.key,
        from: '',
        to: '',
      },
    ]);
  };

  const handleUpdateStatisticRow = (
    id: string,
    field: 'metricKey' | 'from' | 'to',
    value: string,
  ) => {
    setLocalError(null);
    setStatisticRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        const err = validateRangeRow(updated.from, updated.to);
        return { ...updated, error: err };
      }),
    );
  };

  const handleRemoveStatisticRow = (id: string) => {
    setLocalError(null);
    setStatisticRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearAllRanges = () => {
    setLocalError(null);
    setStatisticRows([]);
  };

  // Top N Handlers
  const handleSelectTopNPreset = (preset: number | 'custom') => {
    setLocalError(null);
    setTopNConfig((prev) => ({
      ...prev,
      enabled: true,
      preset,
      metricKey: prev.metricKey || positionPerformanceMetrics[0]?.key || '',
    }));
  };

  const handleTopNCustomChange = (customValue: string) => {
    setLocalError(null);
    setTopNConfig((prev) => ({
      ...prev,
      customValue,
    }));
  };

  const handleTopNMetricChange = (metricKey: string) => {
    setLocalError(null);
    setTopNConfig((prev) => ({
      ...prev,
      metricKey,
    }));
  };

  const handleClearTopN = () => {
    setLocalError(null);
    setTopNConfig((prev) => ({
      ...prev,
      enabled: false,
    }));
  };

  // Chip removers
  const removeCompetitionChip = (id: string) => {
    setSelectedCompetitionIds((prev) => prev.filter((i) => i !== id));
  };

  const removeClubChip = (id: string) => {
    setSelectedClubIds((prev) => prev.filter((i) => i !== id));
  };

  // Reset / Clear All
  const handleClearAll = () => {
    setSelectedCompetitionIds([]);
    setSelectedClubIds([]);
    setSelectedPosition(null);
    setStatisticRows([]);
    setTopNConfig({
      enabled: false,
      preset: 10,
      customValue: '10',
      metricKey: '',
    });
    setLocalError(null);
  };

  // Query Serialization & Execution
  const handleSearchClick = () => {
    setLocalError(null);

    // 1. Validate statistic ranges
    for (const row of statisticRows) {
      const err = validateRangeRow(row.from, row.to);
      if (err) {
        setLocalError(err);
        return;
      }
    }

    // 2. Validate Top N custom rank if enabled
    let topNValue: number | undefined;
    if (topNConfig.enabled) {
      if (topNConfig.preset === 'custom') {
        const parsed = parseInt(topNConfig.customValue.trim(), 10);
        if (isNaN(parsed) || parsed < 1) {
          setLocalError('Please enter a valid Top N rank (must be an integer >= 1).');
          return;
        }
        topNValue = parsed;
      } else {
        topNValue = typeof topNConfig.preset === 'number' ? topNConfig.preset : 10;
      }
    }

    const query = buildSearchQueryNode(
      selectedCompetitionIds,
      selectedClubIds,
      selectedPosition,
      statisticRows,
      topNConfig,
      topNValue,
    );

    const scope = buildSearchScope(selectedCompetitionIds);

    onExecute(query, scope);
  };

  const clubsToDisplayInModal =
    selectedCompetitionIds.length > 0 ? filteredClubs : allClubs;

  return (
    <div className="scout-context-container">
      {/* ── Top Bar with Tactical Title and Action Controls ── */}
      <div className="scout-context-header">
        <div>
          <h2 className="scout-context-title">Tactical Search Context</h2>
          <p className="scout-context-subtitle">
            Configure competition scope, club filters, and tactical position.
          </p>
        </div>
        <div className="scout-context-actions">
          {(selectedCompetitionIds.length > 0 ||
            selectedClubIds.length > 0 ||
            selectedPosition !== null ||
            statisticRows.length > 0 ||
            topNConfig.enabled) && (
            <button
              type="button"
              className="scout-context-clear-btn"
              onClick={handleClearAll}
              disabled={loading}
              title="Reset all context filters"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear All
            </button>
          )}

          <button
            type="button"
            id="scout-run-context-search-btn"
            className="scout-context-search-btn"
            onClick={handleSearchClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="scout-context-spinner" aria-hidden="true" />
                Searching…
              </>
            ) : (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Search Players
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {(localError || error) && (
        <div className="scout-context-alert scout-context-alert--error" role="alert">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{localError || error}</span>
        </div>
      )}

      {/* ── Club-Competition Mismatch Warning ── */}
      {mismatchedClubs.length > 0 && (
        <div className="scout-context-alert scout-context-alert--warning" role="alert">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ flex: 1 }}>
            <strong>Scope Mismatch:</strong>{' '}
            {mismatchedClubs.map((c) => c.name).join(', ')} is not part of the selected
            competition(s). This combination will return 0 matching results.
          </span>
          <button
            type="button"
            className="scout-context-sub-clear"
            style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
            onClick={() => {
              const mismatchedIds = new Set(
                mismatchedClubs.map((c) => (c as any).id || (c as any).teamId),
              );
              setSelectedClubIds((prev) =>
                prev.filter((id) => !mismatchedIds.has(id)),
              );
            }}
          >
            Remove Mismatched ({mismatchedClubs.length})
          </button>
        </div>
      )}

      <div className="scout-context-body">
        {/* ── SECTION 1: Competition Multi-Select ── */}
        <div className="scout-context-card">
          <div className="scout-context-card-header">
            <div className="scout-context-card-label">
              <span className="scout-context-card-icon">🏆</span>
              <span>Competitions (Multi-Select)</span>
            </div>
            {selectedCompetitionIds.length > 0 && (
              <button
                type="button"
                className="scout-context-sub-clear"
                onClick={() => setSelectedCompetitionIds([])}
              >
                Clear ({selectedCompetitionIds.length})
              </button>
            )}
          </div>

          <div className="scout-context-chips-wrapper">
            {selectedCompetitionIds.map((id) => {
              const comp = competitions.find((c) => c.id === id);
              if (!comp) return null;
              return (
                <div key={id} className="scout-context-chip">
                  {comp.logoUrl && (
                    <img
                      src={comp.logoUrl}
                      alt={comp.name}
                      className="scout-context-chip-img"
                    />
                  )}
                  <span>{comp.name}</span>
                  <button
                    type="button"
                    className="scout-context-chip-remove"
                    onClick={() => removeCompetitionChip(id)}
                    aria-label={`Remove ${comp.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              className="scout-context-add-btn"
              onClick={() => setShowCompModal(true)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {selectedCompetitionIds.length === 0
                ? 'Select Competitions'
                : 'Add Competition'}
            </button>
          </div>
        </div>

        {/* ── SECTION 2: Club Multi-Select ── */}
        <div className="scout-context-card">
          <div className="scout-context-card-header">
            <div className="scout-context-card-label">
              <span className="scout-context-card-icon">⚽</span>
              <span>Clubs / Teams (Multi-Select)</span>
              {selectedCompetitionIds.length > 0 && (
                <span className="scout-context-tag-hint">
                  Filtered by {selectedCompetitionIds.length} competition(s)
                </span>
              )}
            </div>
            {selectedClubIds.length > 0 && (
              <button
                type="button"
                className="scout-context-sub-clear"
                onClick={() => setSelectedClubIds([])}
              >
                Clear ({selectedClubIds.length})
              </button>
            )}
          </div>

          <div className="scout-context-chips-wrapper">
            {selectedClubIds.map((id) => {
              const club = allClubs.find(
                (c) => ((c as any).id || (c as any).teamId) === id,
              );
              if (!club) return null;
              return (
                <div key={id} className="scout-context-chip">
                  {club.logoUrl && (
                    <img
                      src={club.logoUrl}
                      alt={club.name}
                      className="scout-context-chip-img"
                    />
                  )}
                  <span>{club.shortName || club.name}</span>
                  <button
                    type="button"
                    className="scout-context-chip-remove"
                    onClick={() => removeClubChip(id)}
                    aria-label={`Remove ${club.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              className="scout-context-add-btn"
              onClick={() => setShowClubModal(true)}
              disabled={loadingClubs}
            >
              {loadingClubs ? (
                <>
                  <span className="scout-context-spinner scout-context-spinner--sm" />
                  Loading Clubs…
                </>
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {selectedClubIds.length === 0 ? 'Select Clubs' : 'Add Club'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── SECTION 3: Tactical Position (SINGLE SELECT) ── */}
        <PositionPickerSection
          selectedPosition={selectedPosition}
          onTogglePosition={handleTogglePosition}
          onClearPosition={() => setSelectedPosition(null)}
        />

        {/* ── SECTION 4: Position Performance & Statistic Ranges ── */}
        {selectedPosition && (
          <StatisticRangesSection
            selectedPosition={selectedPosition}
            positionPerformanceMetrics={positionPerformanceMetrics}
            groupedPerformanceMetrics={groupedPerformanceMetrics}
            statisticRows={statisticRows}
            onAddRow={handleAddStatisticRow}
            onUpdateRow={handleUpdateStatisticRow}
            onRemoveRow={handleRemoveStatisticRow}
            onClearAllRanges={handleClearAllRanges}
          />
        )}

        {/* ── SECTION 5: Top Players by Statistic (Top N) ── */}
        {selectedPosition && positionPerformanceMetrics.length > 0 && (
          <TopNSection
            topNConfig={topNConfig}
            positionPerformanceMetrics={positionPerformanceMetrics}
            groupedPerformanceMetrics={groupedPerformanceMetrics}
            onSelectPreset={handleSelectTopNPreset}
            onCustomChange={handleTopNCustomChange}
            onMetricChange={handleTopNMetricChange}
            onClearTopN={handleClearTopN}
          />
        )}
      </div>

      {/* ── MODALS ── */}
      <CompetitionPickerModal
        isOpen={showCompModal}
        onClose={() => setShowCompModal(false)}
        competitions={competitions}
        selectedCompetitionIds={selectedCompetitionIds}
        onApply={(ids) => setSelectedCompetitionIds(ids)}
      />

      <ClubPickerModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        clubsToDisplay={clubsToDisplayInModal}
        selectedClubIds={selectedClubIds}
        selectedCompetitionCount={selectedCompetitionIds.length}
        onApply={(ids) => setSelectedClubIds(ids)}
      />
    </div>
  );
};
