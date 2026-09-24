import React from "react";
import type { PlayerMatchStatisticItem } from "../../../types/player.types";
import { getMatchContext } from "./player-detail.utils";
import { Notification } from "../../common/Notification";

export interface PlayerMatchLogSectionProps {
  isGoalkeeper: boolean;
  matchStatistics: PlayerMatchStatisticItem[];
  matchLoading: boolean;
  matchError: string | null;
  matchOffset: number;
  setMatchOffset: React.Dispatch<React.SetStateAction<number>>;
  matchTotal: number;
  matchLimit: number;
  selectedSeasonCode: string;
}

export const PlayerMatchLogSection: React.FC<PlayerMatchLogSectionProps> = ({
  isGoalkeeper,
  matchStatistics,
  matchLoading,
  matchError,
  matchOffset,
  setMatchOffset,
  matchTotal,
  matchLimit,
  selectedSeasonCode,
}) => {
  const currentPage = Math.floor(matchOffset / matchLimit) + 1;
  const totalPages = Math.ceil(matchTotal / matchLimit) || 1;

  return (
    <div className="scout-b2b-control-card" style={{ margin: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <div className="scout-detail-section-title">Recent Match Log</div>
          <div
            style={{
              fontSize: "13px",
              color: "#64748b",
              marginTop: "2px",
            }}
          >
            Individual match performances and official statistical ratings
          </div>
        </div>

        {/* Match Pagination Bar */}
        {!matchLoading && !matchError && matchTotal > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="scout-btn scout-btn-sm scout-btn-secondary"
              disabled={matchOffset === 0}
              onClick={() =>
                setMatchOffset((prev) => Math.max(0, prev - matchLimit))
              }
            >
              ← Prev
            </button>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="scout-btn scout-btn-sm scout-btn-secondary"
              disabled={matchOffset + matchLimit >= matchTotal}
              onClick={() => setMatchOffset((prev) => prev + matchLimit)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {matchLoading && (
        <div
          style={{
            color: "#64748b",
            fontSize: "13px",
            fontStyle: "italic",
          }}
        >
          Loading match log...
        </div>
      )}

      {matchError && (
        <Notification variant="error" message={matchError} compact />
      )}

      {!matchLoading && !matchError && matchStatistics.length === 0 && (
        <div className="scout-empty-state compact">
          <div className="scout-empty-state-icon">📋</div>
          <h4 className="scout-empty-state-title">No Match Appearances Recorded</h4>
          <p className="scout-empty-state-desc">
            No individual match logs found for {selectedSeasonCode} in this competition. Try selecting another season or competition above to inspect match logs.
          </p>
        </div>
      )}

      {!matchLoading && !matchError && matchStatistics.length > 0 && (
        <div
          className="scout-b2b-table-wrapper"
          style={{
            borderRadius: "8px",
            border: "1px solid var(--scout-border-default)",
            overflow: "hidden",
          }}
        >
          <table className="scout-b2b-table">
            <thead>
              {isGoalkeeper ? (
                <tr>
                  <th>Date</th>
                  <th>Match / Opponent</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Role</th>
                  <th>Mins</th>
                  <th>Rating</th>
                  <th>Saves</th>
                  <th>Conceded</th>
                  <th>Clean Sheet</th>
                  <th>Pens Saved</th>
                  <th>Pass (Cmp/Att)</th>
                </tr>
              ) : (
                <tr>
                  <th>Date</th>
                  <th>Match / Opponent</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Role</th>
                  <th>Mins</th>
                  <th>Rating</th>
                  <th>G</th>
                  <th>A</th>
                  <th>Shots</th>
                  <th>Pass (Cmp/Att)</th>
                  <th>KP</th>
                  <th>Tk</th>
                </tr>
              )}
            </thead>
            <tbody>
              {matchStatistics.map((item) => {
                const ctx = getMatchContext(item);
                const kickoffStr = item.match.kickoffAt
                  ? new Date(item.match.kickoffAt).toLocaleDateString()
                  : "—";

                return (
                  <tr key={item.id} className="scout-b2b-table-row">
                    {/* Date */}
                    <td style={{ fontSize: "12px", color: "var(--scout-text-secondary)" }}>
                      {kickoffStr}
                    </td>

                    {/* Match / Opponent */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: ctx.isHome ? "#60a5fa" : "#fbbf24",
                            background: ctx.isHome
                              ? "rgba(59, 130, 246, 0.16)"
                              : "rgba(245, 158, 11, 0.16)",
                            border: ctx.isHome
                              ? "1px solid rgba(59, 130, 246, 0.3)"
                              : "1px solid rgba(245, 158, 11, 0.3)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                          }}
                        >
                          {ctx.venuePrefix}
                        </span>
                        <span
                          style={{ fontWeight: 600, color: "var(--scout-text-primary)" }}
                        >
                          {ctx.opponent
                            ? ctx.opponent.shortName || ctx.opponent.name
                            : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Score */}
                    <td
                      style={{
                        fontWeight: 700,
                        color: "var(--scout-text-primary)",
                        fontSize: "13px",
                      }}
                    >
                      {ctx.scoreText}
                    </td>

                    {/* Result Badge */}
                    <td>
                      <span
                        style={{
                          background:
                            ctx.result === "WIN"
                              ? "rgba(34, 197, 94, 0.16)"
                              : ctx.result === "DRAW"
                                ? "rgba(245, 158, 11, 0.16)"
                                : ctx.result === "LOSS"
                                  ? "rgba(239, 68, 68, 0.16)"
                                  : "rgba(255, 255, 255, 0.08)",
                          color:
                            ctx.result === "WIN"
                              ? "#4ade80"
                              : ctx.result === "DRAW"
                                ? "#fbbf24"
                                : ctx.result === "LOSS"
                                  ? "#f87171"
                                  : "var(--scout-text-muted)",
                          border:
                            ctx.result === "WIN"
                              ? "1px solid rgba(34, 197, 94, 0.3)"
                              : ctx.result === "DRAW"
                                ? "1px solid rgba(245, 158, 11, 0.3)"
                                : ctx.result === "LOSS"
                                  ? "1px solid rgba(239, 68, 68, 0.3)"
                                  : "1px solid var(--scout-border-default)",
                          fontWeight: 800,
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          display: "inline-block",
                        }}
                      >
                        {ctx.result === "WIN"
                          ? "W"
                          : ctx.result === "DRAW"
                            ? "D"
                            : ctx.result === "LOSS"
                              ? "L"
                              : "—"}
                      </span>
                    </td>

                    {/* Role: XI / Sub */}
                    <td>
                      <span
                        className="scout-b2b-badge-count"
                        style={{
                          background: item.isStarter
                            ? "rgba(59, 130, 246, 0.16)"
                            : "rgba(255, 255, 255, 0.06)",
                          color: item.isStarter ? "#60a5fa" : "var(--scout-text-muted)",
                          borderColor: item.isStarter
                            ? "rgba(59, 130, 246, 0.3)"
                            : "var(--scout-border-default)",
                          fontSize: "11px",
                        }}
                      >
                        {item.isStarter ? "XI" : "Sub"}
                      </span>
                    </td>

                    {/* Minutes */}
                    <td style={{ fontWeight: 600, color: "var(--scout-text-secondary)" }}>
                      {item.minutesPlayed}'
                    </td>

                    {/* Rating */}
                    <td>
                      {item.rating !== null && item.rating !== undefined ? (
                        <span
                          style={{
                            color: "#d97706",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          ⭐ {Number(item.rating).toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {isGoalkeeper ? (
                      <>
                        {/* Saves */}
                        <td style={{ fontWeight: 700, color: "#0284c7" }}>
                          {item.saves !== null && item.saves !== undefined
                            ? item.saves
                            : "—"}
                        </td>

                        {/* Goals Conceded */}
                        <td
                          style={{
                            fontWeight: 700,
                            color:
                              item.goalsConceded !== null &&
                              item.goalsConceded !== undefined &&
                              item.goalsConceded > 0
                                ? "#b91c1c"
                                : "#64748b",
                          }}
                        >
                          {item.goalsConceded !== null &&
                          item.goalsConceded !== undefined
                            ? item.goalsConceded
                            : "—"}
                        </td>

                        {/* Clean Sheet */}
                        <td>
                          {item.cleanSheets === 1 ? (
                            <span
                              style={{
                                color: "#16a34a",
                                fontWeight: 700,
                              }}
                            >
                              Yes
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>No</span>
                          )}
                        </td>

                        {/* Penalties Saved */}
                        <td style={{ fontWeight: 700, color: "#059669" }}>
                          {item.penaltiesSaved ?? 0}
                        </td>

                        {/* Pass (Cmp/Att) */}
                        <td style={{ fontSize: "12px", fontWeight: 600 }}>
                          {item.passesCompleted}/{item.passesAttempted}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Goals */}
                        <td
                          style={{
                            fontWeight: 700,
                            color: item.goals > 0 ? "#16a34a" : "#64748b",
                          }}
                        >
                          {item.goals}
                        </td>

                        {/* Assists */}
                        <td
                          style={{
                            fontWeight: 700,
                            color: item.assists > 0 ? "#2563eb" : "#64748b",
                          }}
                        >
                          {item.assists}
                        </td>

                        {/* Shots */}
                        <td>{item.shots}</td>

                        {/* Pass (Cmp/Att) */}
                        <td style={{ fontSize: "12px", fontWeight: 600 }}>
                          {item.passesCompleted}/{item.passesAttempted}
                        </td>

                        {/* Key Passes */}
                        <td>{item.keyPasses}</td>

                        {/* Tackles */}
                        <td>{item.tackles}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
