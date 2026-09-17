import React from "react";
import type { PlayerDetail } from "../../../types/player.types";
import { getPositionRoleInfo } from "../../../utils/position.utils";
import { calculateAge } from "./player-detail.utils";

export interface PlayerBioSectionProps {
  player: PlayerDetail;
  flagUrl: string | null;
}

export const PlayerBioSection: React.FC<PlayerBioSectionProps> = ({
  player,
  flagUrl,
}) => {
  return (
    <div
      className="scout-b2b-control-card flex flex-col justify-between"
      style={{ margin: 0 }}
    >
      <div>
        <div className="scout-detail-section-title">Physical & Bio</div>

        <div className="scout-sports-bio-list" style={{ marginTop: "16px" }}>
          {player.dateOfBirth && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Age / Date of Birth</span>
              <strong className="scout-sports-bio-val">
                {calculateAge(player.dateOfBirth)} yrs ({new Date(player.dateOfBirth).toLocaleDateString()})
              </strong>
            </div>
          )}

          {player.nationality && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Nationality</span>
              <strong
                className="scout-sports-bio-val"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt={player.nationality}
                    style={{ width: "20px", height: "14px", objectFit: "cover", borderRadius: "2px" }}
                  />
                )}
                <span>{player.nationality}</span>
              </strong>
            </div>
          )}

          {player.heightCm != null && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Height</span>
              <strong className="scout-sports-bio-val">{player.heightCm} cm</strong>
            </div>
          )}

          {player.weightKg != null && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Weight</span>
              <strong className="scout-sports-bio-val">{player.weightKg} kg</strong>
            </div>
          )}

          {player.shirtNumber != null && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Shirt Number</span>
              <strong className="scout-sports-bio-val">#{player.shirtNumber}</strong>
            </div>
          )}

          {player.currentTeam && (
            <div className="scout-sports-bio-row">
              <span className="scout-sports-bio-key">Current Club</span>
              <strong
                className="scout-sports-bio-val"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--scout-text-primary)",
                }}
              >
                {player.currentTeam.logoUrl && (
                  <img
                    src={player.currentTeam.logoUrl}
                    alt={player.currentTeam.name}
                    style={{ width: "20px", height: "20px", objectFit: "contain" }}
                  />
                )}
                <span>{player.currentTeam.name}</span>
              </strong>
            </div>
          )}

          <div className="scout-sports-bio-row" style={{ borderBottom: "none" }}>
            <span className="scout-sports-bio-key">Positions</span>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {player.positions && player.positions.length > 0 ? (
                player.positions.map((pos) => {
                  const roleInfo = getPositionRoleInfo(pos.positionCode);
                  return (
                    <span
                      key={pos.id}
                      className={`scout-b2b-pos-badge ${roleInfo.badgeClass}`}
                      style={{
                        opacity: pos.isPrimary ? 1 : 0.75,
                        fontWeight: pos.isPrimary ? 700 : 600,
                      }}
                    >
                      {pos.positionCode} {pos.isPrimary ? "(Primary)" : ""}
                    </span>
                  );
                })
              ) : (
                <span
                  className={`scout-b2b-pos-badge ${
                    getPositionRoleInfo(player.primaryPosition).badgeClass
                  }`}
                >
                  {player.primaryPosition || "—"} (Primary)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
