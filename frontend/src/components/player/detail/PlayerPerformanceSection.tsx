import React, { useMemo } from "react";
import type { PlayerDetail, PlayerSeasonStatisticItem } from "../../../types/player.types";
import { getPositionRoleInfo } from "../../../utils/position.utils";
import { getRadarMetrics } from "../../../utils/radar.utils";
import { PlayerRadarChart } from "../PlayerRadarChart";
import { PerformanceCards } from "../PerformanceCards";

export interface PlayerPerformanceSectionProps {
  player: PlayerDetail;
  seasonStatistics: PlayerSeasonStatisticItem[];
  selectedStatistic: PlayerSeasonStatisticItem | null;
  statsLoading: boolean;
  statsError: string | null;

  selectedSeasonCode: string;
  setSelectedSeasonCode: (code: string) => void;
  availableSeasons: Array<{ seasonCode: string; isCurrent: boolean }>;

  selectedCompetitionId: string;
  setSelectedCompetitionId: (id: string) => void;
  availableCompetitions: Array<{ id: string; name: string; country: string | null }>;

  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;
  availableTeams: Array<{ id: string; name: string }>;
}

export const PlayerPerformanceSection: React.FC<PlayerPerformanceSectionProps> = ({
  player,
  seasonStatistics,
  selectedStatistic,
  statsLoading,
  statsError,
  selectedSeasonCode,
  setSelectedSeasonCode,
  availableSeasons,
  selectedCompetitionId,
  setSelectedCompetitionId,
  availableCompetitions,
  selectedTeamId,
  setSelectedTeamId,
  availableTeams,
}) => {
  const positionRole = getPositionRoleInfo(player.primaryPosition);

  // Position-aware Radar Chart metrics (7 Tactical Profiles)
  const radarMetrics = useMemo(() => {
    return getRadarMetrics(player.primaryPosition, selectedStatistic);
  }, [player.primaryPosition, selectedStatistic]);

  return (
    <div className="scout-b2b-control-card" style={{ margin: 0 }}>
      {/* Header with Title + Context Selectors */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div className="scout-perf-header-title">PLAYER PERFORMANCE</div>
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginTop: "4px",
            }}
          >
            Standardized per-90 metrics & tactical output across campaigns
          </div>
        </div>

        {/* Season & Competition Selectors */}
        {seasonStatistics.length > 0 && (
          <div className="scout-sports-context-selectors">
            <select
              className="scout-b2b-select scout-sports-select"
              value={selectedSeasonCode}
              onChange={(e) => setSelectedSeasonCode(e.target.value)}
              aria-label="Select Season"
            >
              {availableSeasons.map((s) => (
                <option key={s.seasonCode} value={s.seasonCode}>
                  Season {s.seasonCode} {s.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>

            <select
              className="scout-b2b-select scout-sports-select"
              value={selectedCompetitionId}
              onChange={(e) => setSelectedCompetitionId(e.target.value)}
              aria-label="Select Competition"
            >
              {availableCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.country ? `(${c.country})` : ""}
                </option>
              ))}
            </select>

            {availableTeams.length > 1 && (
              <select
                className="scout-b2b-select scout-sports-select"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                aria-label="Select Team"
              >
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {statsLoading && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontStyle: "italic",
            padding: "20px 0",
          }}
        >
          Loading performance metrics...
        </div>
      )}

      {statsError && (
        <div
          className="scout-b2b-alert-error"
          style={{ fontSize: "13px", margin: "14px 0" }}
        >
          ⚠️ {statsError}
        </div>
      )}

      {!statsLoading && selectedStatistic && (
        <div className="scout-fc-perf-grid-30-70">
          {/* Left Column - Radar Chart (30% - lg:col-span-4) */}
          <div className="scout-fc-radar-panel">
            <PlayerRadarChart
              metrics={radarMetrics}
              positionLabel={player.primaryPosition || "Player"}
              roleHexColor={positionRole.hexColor}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <PerformanceCards
              stats={selectedStatistic}
              positionCode={player.primaryPosition}
            />
          </div>
        </div>
      )}
    </div>
  );
};
