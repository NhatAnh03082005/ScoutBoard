import React from "react";
import type { PlayerItem } from "../../types/player.types";
import { getPositionRoleInfo } from "../../utils/position.utils";

interface PlayerCardProps {
  player: PlayerItem;
  onSelect: (playerId: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  // Helper to compute age from dateOfBirth
  const calculateAge = (dateOfBirth?: string | null): string => {
    if (!dateOfBirth) return "—";
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  const clubName =
    player.currentTeam?.shortName || player.currentTeam?.name || "Free Agent";
  const position = player.primaryPosition || "—";
  const positionRole = getPositionRoleInfo(player.primaryPosition);
  const secondaryPositions = (player.positions || [])
    .filter(
      (item) => !item.isPrimary && item.positionCode !== player.primaryPosition,
    )
    .slice(0, 2);
  const foot =
    player.preferredFoot === "LEFT"
      ? "Left"
      : player.preferredFoot === "RIGHT"
        ? "Right"
        : player.preferredFoot === "BOTH"
          ? "Both"
          : "—";

  return (
    <div
      className="scout-fc-card"
      onClick={() => onSelect(player.id)}
      role="button"
      tabIndex={0}
      aria-label={`View scouting profile for ${player.fullName}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(player.id);
        }
      }}
    >
      {/* 1. Background Layer: Light background with default Facebook silhouette avatar */}
      <div className="scout-fc-card-bg">
        <svg
          viewBox="0 0 300 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        >
          <rect width="300" height="400" fill="#eff6ff" />
          <circle cx="150" cy="200" r="180" fill="#dbeafe" fillOpacity="0.5" />
          {/* Default Person Silhouette (Facebook Avatar style) */}
          <circle cx="150" cy="135" r="50" fill="#94a3b8" />
          <path
            d="M50 310C50 242 94 205 150 205C206 205 250 242 250 310V400H50V310Z"
            fill="#94a3b8"
          />
        </svg>
      </div>

      {/* 2. Image Zone: Real Player Cutout Image if available */}
      {player.imageUrl && (
        <div className="scout-fc-card-image-zone">
          <img
            src={player.imageUrl}
            alt={player.fullName}
            className="scout-fc-card-img"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* 3. Subtle Bottom Gradient Overlay for Readability */}
      <div className="scout-fc-card-overlay" />

      {/* 4. Top Identification Layer (Position, Nationality, Club, Jersey Number) */}
      <div className="scout-fc-card-top-anchor">
        <div className="scout-fc-card-header-left">
          <div className="scout-fc-card-position-row">
            <span
              className={`scout-fc-card-pos-badge ${positionRole.badgeClass}`}
            >
              {position}
            </span>
            {secondaryPositions.map((secondaryPosition) => (
              <span
                key={secondaryPosition.id}
                className="scout-fc-card-secondary-pos-badge"
              >
                {secondaryPosition.positionCode}
              </span>
            ))}
          </div>
          {player.nationality && (
            <span className="scout-fc-card-nation" title={player.nationality}>
              {player.nationality}
            </span>
          )}
          <span className="scout-fc-card-club" title={clubName}>
            {clubName}
          </span>
          {player.shirtNumber ? (
            <span className="scout-fc-card-jersey-number">
              #{player.shirtNumber}
            </span>
          ) : null}
        </div>
      </div>

      {/* 5. Bottom Text Anchor: Strictly Anchored to Bottom */}
      <div className="scout-fc-card-bottom-anchor">
        <h3 className="scout-fc-card-name" title={player.fullName}>
          {player.fullName}
        </h3>

        <div className="scout-fc-card-meta-row">
          <span>{calculateAge(player.dateOfBirth)}</span>
          <span className="scout-fc-meta-dot">•</span>
          <span>{player.heightCm ? `${player.heightCm} cm` : "—"}</span>
          <span className="scout-fc-meta-dot">•</span>
          <span>{foot}</span>
        </div>
      </div>
    </div>
  );
};
