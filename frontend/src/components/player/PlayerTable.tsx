import React from "react";
import type { PlayerItem } from "../../types/player.types";
import { getPositionRoleInfo } from "../../utils/position.utils";
import { getNationalityFlagUrl } from "../../utils/nationality-flag.util";

interface PlayerTableProps {
  players: PlayerItem[];
  loading?: boolean;
  onPlayerSelect: (playerId: string) => void;
  onResetFilters?: () => void;
}

export const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  loading = false,
  onPlayerSelect,
  onResetFilters,
}) => {
  // Helper to compute initials for avatar fallback (e.g. Bukayo Saka -> BS)
  const getInitials = (name: string): string => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper to compute age from dateOfBirth (returns empty string if null)
  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return "";
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age}`;
  };

  return (
    <div className="scout-b2b-table-card">
      <div className="scout-b2b-table-wrapper">
        <table className="scout-b2b-table">
          <thead>
            <tr>
              <th style={{ minWidth: "220px" }}>PLAYER</th>
              <th style={{ minWidth: "160px" }}>CLUB</th>
              <th style={{ minWidth: "90px" }}>POSITION</th>
              <th style={{ minWidth: "80px" }}>AGE</th>
              <th style={{ minWidth: "100px" }}>HEIGHT</th>
              <th style={{ minWidth: "100px" }}>WEIGHT</th>
              <th style={{ minWidth: "120px" }}>NATIONALITY</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Shimmer loading table rows (7 columns)
              Array.from({ length: 10 }).map((_, idx) => (
                <tr
                  key={`shimmer-row-${idx}`}
                  className="scout-table-row-skeleton"
                >
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div className="skeleton-b2b-avatar" />
                      <div
                        className="skeleton-line"
                        style={{ width: "120px", height: "14px" }}
                      />
                    </div>
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{ width: "90px", height: "14px" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{
                        width: "40px",
                        height: "22px",
                        borderRadius: "6px",
                      }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{ width: "50px", height: "14px" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{ width: "30px", height: "14px" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{ width: "50px", height: "14px" }}
                    />
                  </td>
                  <td>
                    <div
                      className="skeleton-line"
                      style={{ width: "70px", height: "14px" }}
                    />
                  </td>
                </tr>
              ))
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={7} className="scout-table-empty-cell">
                  <div className="scout-table-empty-state">
                    <span className="scout-table-empty-icon">⚽</span>
                    <p className="scout-table-empty-title">No players found</p>
                    <p className="scout-table-empty-desc">
                      Try adjusting your search keyword or clearing filters.
                    </p>
                    {onResetFilters && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="scout-b2b-btn scout-b2b-btn-secondary"
                        style={{ marginTop: "12px" }}
                      >
                        <span>🔄</span>
                        <span>Clear filters</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              players.map((player) => {
                const clubName =
                  player.currentTeam?.shortName ||
                  player.currentTeam?.name ||
                  "Free Agent";
                const position = player.primaryPosition || "";
                const positionRole = getPositionRoleInfo(
                  player.primaryPosition,
                );
                const flagUrl = getNationalityFlagUrl(
                  player.nationality,
                  player.nationalityFlagUrl,
                );

                return (
                  <tr
                    key={player.id}
                    onClick={() => onPlayerSelect(player.id)}
                    className="scout-b2b-table-row"
                    title={`Click to view details for ${player.fullName}`}
                  >
                    {/* 1. Player (Avatar + Name) */}
                    <td>
                      <div className="scout-player-cell">
                        <div className="scout-b2b-avatar">
                          {player.imageUrl ? (
                            <img
                              src={player.imageUrl}
                              alt={player.fullName}
                              className="scout-b2b-avatar-img"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display =
                                  "none";
                                if (e.currentTarget.nextElementSibling) {
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement
                                  ).style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <span
                            className="scout-b2b-avatar-fallback"
                            style={{
                              display: player.imageUrl ? "none" : "flex",
                            }}
                          >
                            {getInitials(player.fullName)}
                          </span>
                        </div>
                        <div className="scout-player-name-wrapper">
                          <span className="scout-player-name-text">
                            {player.fullName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Club */}
                    <td>
                      <div
                        className="scout-club-cell"
                        title={clubName}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        {player.currentTeam?.logoUrl && (
                          <img
                            src={player.currentTeam.logoUrl}
                            alt={clubName}
                            style={{ width: "16px", height: "16px", objectFit: "contain" }}
                          />
                        )}
                        <span>{clubName}</span>
                      </div>
                    </td>

                    {/* 3. Visual Position Badge */}
                    <td>
                      {position && (
                        <span
                          className={`scout-b2b-pos-badge ${positionRole.badgeClass}`}
                        >
                          {position}
                        </span>
                      )}
                    </td>

                    {/* 4. Age (Empty if null) */}
                    <td>
                      <span className="scout-b2b-text-main">
                        {calculateAge(player.dateOfBirth)}
                      </span>
                    </td>

                    {/* 5. Height (Empty if null) */}
                    <td>
                      <span className="scout-b2b-text-main">
                        {player.heightCm != null ? `${player.heightCm} cm` : ""}
                      </span>
                    </td>

                    {/* 6. Weight (Empty if null) */}
                    <td>
                      <span className="scout-b2b-text-main">
                        {player.weightKg != null ? `${player.weightKg} kg` : ""}
                      </span>
                    </td>

                    {/* 7. Nationality with Flag (Empty if null) */}
                    <td>
                      {player.nationality ? (
                        <span
                          className="scout-b2b-text-secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          {flagUrl && (
                            <img
                              src={flagUrl}
                              alt={player.nationality}
                              style={{ width: "16px", height: "11px", objectFit: "cover", borderRadius: "2px" }}
                            />
                          )}
                          <span>{player.nationality}</span>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
