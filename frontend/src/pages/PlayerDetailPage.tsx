import React, { useState } from "react";
import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
} from "../types/player.types";
import { AddToShortlistModal } from "../components/shortlist/AddToShortlistModal";
import { getNationalityFlagUrl } from "../utils/nationality-flag.util";
import {
  usePlayerDetail,
  PlayerHeroSection,
  PlayerBioSection,
  PlayerCareerHistorySection,
  PlayerPerformanceSection,
  PlayerMatchLogSection,
} from "../components/player/detail";
import { Notification } from "../components/common/Notification";

interface PlayerDetailPageProps {
  playerId: string;
  onBack: () => void;
  onCompare?: (
    player: PlayerDetail,
    seasonStatistics: PlayerSeasonStatisticItem[],
  ) => void;
}

export const PlayerDetailPage: React.FC<PlayerDetailPageProps> = ({
  playerId,
  onBack,
  onCompare,
}) => {
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    player,
    loading,
    error,
    teamHistory,
    loadingHistory,
    historyError,
    seasonStatistics,
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
    selectedStatistic,
    matchStatistics,
    matchLoading,
    matchError,
    matchOffset,
    setMatchOffset,
    matchTotal,
    matchLimit,
  } = usePlayerDetail(playerId);

  const isGoalkeeper = player?.primaryPosition === "GK";
  const flagUrl = player
    ? getNationalityFlagUrl(player.nationality, player.nationalityFlagUrl)
    : null;

  return (
    <div className="scout-b2b-page-container">
      {/* Top Header Navigation Bar with Breadcrumb Context & Action Hierarchy */}
      <div className="scout-sports-topbar">
        <div className="scout-detail-breadcrumb">
          <button
            type="button"
            className="scout-sports-back-btn"
            onClick={onBack}
            title="Return to Player Search"
            aria-label="Return to Player Search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Search Results</span>
          </button>
          {player?.currentTeam && (
            <>
              <span style={{ color: "var(--scout-border-default)", opacity: 0.6 }}>/</span>
              <span style={{ color: "var(--scout-text-secondary)", fontSize: "12.5px" }}>
                {player.currentTeam.name}
              </span>
            </>
          )}
          {player && (
            <>
              <span style={{ color: "var(--scout-border-default)", opacity: 0.6 }}>/</span>
              <span style={{ color: "var(--scout-text-primary)", fontWeight: 700, fontSize: "13px" }}>
                {player.fullName}
              </span>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Secondary Action: Add to Shortlist (Bookmark Style) */}
          {player && (
            <button
              type="button"
              className="scout-btn scout-btn-secondary"
              onClick={() => setIsShortlistModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                color: "#60a5fa",
                background: "rgba(37, 99, 235, 0.12)",
                fontWeight: 700,
              }}
              title="Save player to scouting watchlist"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>Add to Shortlist</span>
            </button>
          )}

          {/* Primary Action: Compare Player (Analytical Core Feature) */}
          {player && onCompare && (
            <button
              type="button"
              className="scout-btn scout-btn-primary"
              onClick={() => onCompare(player, seasonStatistics)}
              title="Open tactical comparison for this player"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
              <span>Compare Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <Notification
          variant="success"
          mode="toast"
          message={toastMessage}
          autoDismissMs={3500}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {player && (
        <AddToShortlistModal
          isOpen={isShortlistModalOpen}
          onClose={() => setIsShortlistModalOpen(false)}
          player={player}
          onSuccess={(shortlistName) => {
            setToastMessage(`Added ${player.fullName || player.name} to "${shortlistName}"`);
          }}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Notification
          variant="error"
          message={error}
          actions={(
            <button
              type="button"
              className="scout-btn scout-btn-sm scout-btn-secondary"
              onClick={onBack}
            >
              Return to Search
            </button>
          )}
          style={{ marginBottom: "20px" }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div
          className="scout-fc-hero-banner"
          style={{
            minHeight: "380px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#94a3b8" }}>
            <div className="scout-loading-spinner" />
            <div
              style={{
                marginTop: "12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#cbd5e1",
              }}
            >
              Loading professional player profile...
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      {!loading && !error && player && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* 1. PLAYER HERO CARD */}
          <PlayerHeroSection
            player={player}
            selectedStatistic={selectedStatistic}
            flagUrl={flagUrl}
          />

          {/* 2. PHYSICAL & BIO  |  CAREER HISTORY */}
          <div className="scout-sports-split-grid">
            <PlayerBioSection player={player} flagUrl={flagUrl} />
            <PlayerCareerHistorySection
              teamHistory={teamHistory}
              loadingHistory={loadingHistory}
              historyError={historyError}
            />
          </div>

          {/* 3. PLAYER PERFORMANCE */}
          <PlayerPerformanceSection
            player={player}
            seasonStatistics={seasonStatistics}
            selectedStatistic={selectedStatistic}
            statsLoading={statsLoading}
            statsError={statsError}
            selectedSeasonCode={selectedSeasonCode}
            setSelectedSeasonCode={setSelectedSeasonCode}
            availableSeasons={availableSeasons}
            selectedCompetitionId={selectedCompetitionId}
            setSelectedCompetitionId={setSelectedCompetitionId}
            availableCompetitions={availableCompetitions}
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
            availableTeams={availableTeams}
          />

          {/* 4. RECENT MATCH LOG TABLE */}
          <PlayerMatchLogSection
            isGoalkeeper={isGoalkeeper}
            matchStatistics={matchStatistics}
            matchLoading={matchLoading}
            matchError={matchError}
            matchOffset={matchOffset}
            setMatchOffset={setMatchOffset}
            matchTotal={matchTotal}
            matchLimit={matchLimit}
            selectedSeasonCode={selectedSeasonCode}
          />
        </div>
      )}
    </div>
  );
};
