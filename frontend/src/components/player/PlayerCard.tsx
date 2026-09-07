import React from "react";
import type { PlayerItem } from "../../types/player.types";
import { getPositionRoleInfo } from "../../utils/position.utils";
import { getNationalityFlagUrl } from "../../utils/nationality-flag.util";

interface PlayerCardProps {
  player: PlayerItem;
  onSelect: (playerId: string) => void;
  onAddToShortlist?: (player: PlayerItem, e: React.MouseEvent) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onSelect,
}) => {
  // Helper to compute age from dateOfBirth
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
    return `${age} yrs`;
  };

  const clubName =
    player.currentTeam?.shortName || player.currentTeam?.name || "Free Agent";
  const position = player.primaryPosition || "—";
  const positionRole = getPositionRoleInfo(player.primaryPosition);

  const flagUrl = getNationalityFlagUrl(
    player.nationality,
    player.nationalityFlagUrl,
  );

  const formatWeight = (val?: number | string | null): string => {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/kg/i, '').trim();
    return clean ? `${clean} kg` : '';
  };

  const formatHeight = (val?: number | string | null): string => {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/cm/i, '').trim();
    return clean ? `${clean} cm` : '';
  };

  // 3 meta fields: Tuổi - Chiều cao - Cân nặng (Omit any field that is null/empty)
  const cardMetaItems: string[] = [];
  if (player.dateOfBirth) {
    const age = calculateAge(player.dateOfBirth);
    if (age) cardMetaItems.push(age);
  }
  const heightStr = formatHeight(player.heightCm);
  if (heightStr) {
    cardMetaItems.push(heightStr);
  }
  const weightStr = formatWeight(player.weightKg);
  if (weightStr) {
    cardMetaItems.push(weightStr);
  }

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
      {/* 1. Background Layer: Clean pure white background matching cutouts */}
      <div className="scout-fc-card-bg" />

      {/* 2. Top-Left Column: Vị trí & Số áo */}
      <div className="scout-fc-card-top-left">
        {/* 1. Vị trí */}
        <div
          className={`scout-fc-card-pos-badge ${positionRole.badgeClass}`}
          title={`Position: ${position}`}
        >
          {position}
        </div>

        {/* 2. Số áo */}
        {player.shirtNumber != null && (
          <div
            className="scout-fc-card-shirt-badge"
            title={`Shirt Number: #${player.shirtNumber}`}
          >
            #{player.shirtNumber}
          </div>
        )}
      </div>

      {/* 3. Top-Right Column: Logo CLB & Quốc kì (Không border, không background khác biệt) */}
      <div className="scout-fc-card-top-right">
        {/* Logo Club */}
        {player.currentTeam?.logoUrl && (
          <div
            className="scout-fc-card-club-badge"
            title={`Club: ${clubName}`}
          >
            <img
              src={player.currentTeam.logoUrl}
              alt={clubName}
              className="scout-fc-card-club-img"
            />
          </div>
        )}

        {/* Quốc kì */}
        {flagUrl && (
          <div
            className="scout-fc-card-flag-badge"
            title={`Nationality: ${player.nationality || ''}`}
          >
            <img
              src={flagUrl}
              alt={player.nationality || "Flag"}
              className="scout-fc-card-flag-img"
            />
          </div>
        )}
      </div>

      {/* 4. Image Zone: Player Cutout Image (Natural flex container directly above name) */}
      <div className="scout-fc-card-image-zone">
        {player.imageUrl && (
          <img
            src={player.imageUrl}
            alt={player.fullName}
            className="scout-fc-card-img"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* 5. Bottom Info Area: Player Name (prominent, blue, large) + Age - Height - Weight (Centered vertically in bottom space) */}
      <div className="scout-fc-card-bottom-anchor">
        <h3 className="scout-fc-card-name" title={player.fullName}>
          {player.fullName}
        </h3>

        {cardMetaItems.length > 0 && (
          <div className="scout-fc-card-meta-row">
            {cardMetaItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="scout-fc-meta-dot">•</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
