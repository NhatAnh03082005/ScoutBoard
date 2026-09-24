import React from "react";
import type { PlayerTeamHistoryItem } from "../../../types/player.types";
import { Notification } from "../../common/Notification";

export interface PlayerCareerHistorySectionProps {
  teamHistory: PlayerTeamHistoryItem[];
  loadingHistory: boolean;
  historyError: string | null;
}

export const PlayerCareerHistorySection: React.FC<PlayerCareerHistorySectionProps> = ({
  teamHistory,
  loadingHistory,
  historyError,
}) => {
  return (
    <div
      className="scout-b2b-control-card flex flex-col h-[380px]"
      style={{ margin: 0 }}
    >
      <div className="scout-detail-section-title shrink-0">Career History</div>

      {loadingHistory && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontStyle: "italic",
            marginTop: "14px",
          }}
        >
          Loading career history...
        </div>
      )}

      {historyError && (
        <Notification
          variant="error"
          message={historyError}
          compact
          style={{ marginTop: "14px" }}
        />
      )}

      {!loadingHistory && !historyError && teamHistory.length === 0 && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontStyle: "italic",
            marginTop: "14px",
          }}
        >
          No career history recorded for this player.
        </div>
      )}

      {!loadingHistory && !historyError && teamHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto pr-3 mt-2 scout-custom-scrollbar">
          <div className="scout-sports-timeline" style={{ marginTop: "12px" }}>
            {teamHistory.map((item) => (
              <div
                key={item.id}
                className={`scout-sports-timeline-item ${item.isCurrent ? "current" : ""}`}
              >
                <div className="scout-sports-timeline-dot" />
                <div className="scout-sports-timeline-content">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "var(--scout-text-primary)",
                      }}
                    >
                      {item.team.name}
                    </div>
                    {item.isCurrent && (
                      <span
                        className="scout-b2b-badge-count"
                        style={{ fontSize: "10px", padding: "2px 6px" }}
                      >
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    <span>
                      {item.joinedAt ? new Date(item.joinedAt).getFullYear() : "—"}{" "}
                      —{" "}
                      {item.isCurrent
                        ? "Present"
                        : item.leftAt
                          ? new Date(item.leftAt).getFullYear()
                          : "—"}
                    </span>
                    {item.shirtNumber && (
                      <span className="scout-detail-shirt-badge">
                        #{item.shirtNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
