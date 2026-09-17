import React, { useMemo } from "react";
import type { PlayerDetail, PlayerSeasonStatisticItem } from "../../../types/player.types";
import { getPositionRoleInfo, getPositionCategory } from "../../../utils/position.utils";
import { formatSportsName, calculateAge } from "./player-detail.utils";

export interface PlayerHeroSectionProps {
  player: PlayerDetail;
  selectedStatistic: PlayerSeasonStatisticItem | null;
  flagUrl: string | null;
}

export const PlayerHeroSection: React.FC<PlayerHeroSectionProps> = ({
  player,
  selectedStatistic,
  flagUrl,
}) => {
  const playerName = player.fullName || player.name;
  const { firstName, lastName } = formatSportsName(playerName);
  const positionRole = getPositionRoleInfo(player.primaryPosition);
  const positionCategory = getPositionCategory(player.primaryPosition);

  // Position-aware KPI statistics for Hero Banner (2 dynamic role stats)
  const heroRoleStats: [
    { label: string; value: string | number; valClass: string },
    { label: string; value: string | number; valClass: string },
  ] = useMemo(() => {
    if (positionCategory === "GK") {
      return [
        {
          label: "SAVES",
          value: selectedStatistic ? (selectedStatistic.saves ?? 0) : "—",
          valClass: "val-saves",
        },
        {
          label: "CLEAN SHEETS",
          value: selectedStatistic ? (selectedStatistic.cleanSheets ?? 0) : "—",
          valClass: "val-cleansheets",
        },
      ];
    }

    if (positionCategory === "DEF") {
      return [
        {
          label: "TACKLES",
          value: selectedStatistic ? (selectedStatistic.tackles ?? 0) : "—",
          valClass: "val-tackles",
        },
        {
          label: "INTERCEPTIONS",
          value: selectedStatistic ? (selectedStatistic.interceptions ?? 0) : "—",
          valClass: "val-interceptions",
        },
      ];
    }

    // MID, ATT, and Safe Fallback (Goals & Assists)
    return [
      {
        label: "GOALS",
        value: selectedStatistic ? selectedStatistic.goals : "—",
        valClass: "val-goals",
      },
      {
        label: "ASSISTS",
        value: selectedStatistic ? selectedStatistic.assists : "—",
        valClass: "val-assists",
      },
    ];
  }, [positionCategory, selectedStatistic]);

  const heroBioItems: string[] = [];
  if (player.dateOfBirth) {
    const age = calculateAge(player.dateOfBirth);
    if (age && age !== "—") heroBioItems.push(`${age} YRS`);
  }
  if (player.heightCm != null) {
    heroBioItems.push(`${player.heightCm} CM`);
  }
  if (player.weightKg != null) {
    heroBioItems.push(`${player.weightKg} KG`);
  }

  return (
    <div className="scout-fc-hero-banner" style={{ overflow: "hidden" }}>
      {/* Ambient Sports Geometry Glow */}
      <div className="scout-fc-hero-ambient" />
      <div className="scout-fc-hero-grid-pattern" />

      <div className="scout-hero-12col-grid">
        {/* Left Column (The Player Card/Image - 3 cols) */}
        <div className="scout-hero-col-left">
          <div className="scout-fc-card-frame">
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={playerName}
                className="scout-fc-player-img"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  if (e.currentTarget.nextElementSibling) {
                    (
                      e.currentTarget.nextElementSibling as HTMLElement
                    ).style.display = "flex";
                  }
                }}
              />
            ) : null}

            {/* Facebook-style Default Silhouette Avatar Fallback */}
            <div
              className="scout-fc-player-card-fallback"
              style={{ display: player.imageUrl ? "none" : "flex" }}
            >
              <svg
                viewBox="0 0 200 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
                style={{ width: "100%", height: "100%", borderRadius: "18px" }}
              >
                <rect width="200" height="260" fill="#eff6ff" />
                <circle cx="100" cy="130" r="110" fill="#dbeafe" fillOpacity="0.5" />
                <circle cx="100" cy="85" r="36" fill="#94a3b8" />
                <path
                  d="M32 205C32 155 62 130 100 130C138 130 168 155 168 205V260H32V205Z"
                  fill="#94a3b8"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column (Identity & Stats - 9 cols) */}
        <div className="scout-hero-col-right">
          {/* Top line: Club & Nation */}
          <div
            className="scout-fc-club-nation"
            style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
          >
            {player.currentTeam && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {player.currentTeam.logoUrl && (
                  <img
                    src={player.currentTeam.logoUrl}
                    alt={player.currentTeam.name}
                    style={{ width: "18px", height: "18px", objectFit: "contain" }}
                  />
                )}
                <span>{player.currentTeam.name}</span>
              </span>
            )}
            {player.currentTeam && player.nationality && (
              <span className="scout-fc-dot">•</span>
            )}
            {player.nationality && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt={player.nationality}
                    style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }}
                  />
                )}
                <span>{player.nationality}</span>
              </span>
            )}
            {player.shirtNumber != null && (
              <>
                <span className="scout-fc-dot">•</span>
                <span style={{ color: "#fde047" }}>
                  #{player.shirtNumber}
                </span>
              </>
            )}
          </div>

          {/* 1. Name & Position Row (Top Alignment) */}
          <div className="scout-hero-name-pos-row">
            <h1 className="scout-hero-name-headline">
              {firstName && (
                <span className="scout-fc-name-first">{firstName} </span>
              )}
              <span className="scout-fc-name-last">{lastName}</span>
            </h1>
            <div className={`scout-hero-pos-badge ${positionRole.cssClass}`}>
              {player.primaryPosition || "CM"}
            </div>
          </div>

          {/* 2. Bio Attributes Sub-Row (Null Fields Completely Hidden) */}
          {heroBioItems.length > 0 && (
            <div className="scout-hero-bio-row">
              {heroBioItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="scout-hero-bio-dot">•</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* 5 REAL PERFORMANCE KPIS (5-Column Grid spanning full width) */}
          <div className="scout-hero-kpi-grid-5">
            <div className="scout-hero-kpi-box">
              <span className="scout-hero-kpi-val">
                {selectedStatistic ? selectedStatistic.appearances : "—"}
              </span>
              <span className="scout-hero-kpi-lbl">APPS</span>
            </div>

            <div className="scout-hero-kpi-box">
              <span className="scout-hero-kpi-val">
                {selectedStatistic ? selectedStatistic.starts : "—"}
              </span>
              <span className="scout-hero-kpi-lbl">STARTS</span>
            </div>

            <div className="scout-hero-kpi-box">
              <span className="scout-hero-kpi-val">
                {selectedStatistic
                  ? `${selectedStatistic.minutesPlayed.toLocaleString()}'`
                  : "—"}
              </span>
              <span className="scout-hero-kpi-lbl">MINS</span>
            </div>

            <div className="scout-hero-kpi-box">
              <span className={`scout-hero-kpi-val ${heroRoleStats[0].valClass}`}>
                {heroRoleStats[0].value}
              </span>
              <span className="scout-hero-kpi-lbl">{heroRoleStats[0].label}</span>
            </div>

            <div className="scout-hero-kpi-box">
              <span className={`scout-hero-kpi-val ${heroRoleStats[1].valClass}`}>
                {heroRoleStats[1].value}
              </span>
              <span className="scout-hero-kpi-lbl">{heroRoleStats[1].label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
