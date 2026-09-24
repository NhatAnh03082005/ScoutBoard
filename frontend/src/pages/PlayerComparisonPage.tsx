import React, { useState } from 'react';
import type {
  PlayerDetail,
  ComparisonScopeType,
} from '../types/player.types';
import { AddToShortlistModal } from '../components/shortlist/AddToShortlistModal';
import {
  usePlayerComparison,
  ComparisonHeroCards,
  ComparisonRadarSection,
  ComparisonMetricsTable,
  ComparisonBottomBar,
} from '../components/player/comparison';
import { Notification } from '../components/common/Notification';

interface PlayerComparisonPageProps {
  playerAId: string;
  playerBId: string;
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId?: string;
  onBackToSetup: () => void;
  onBackToDetail: () => void;
}

export const PlayerComparisonPage: React.FC<PlayerComparisonPageProps> = ({
  playerAId,
  playerBId,
  scope,
  seasonId,
  competitionId,
  onBackToSetup,
  onBackToDetail,
}) => {
  const [shortlistTargetPlayer, setShortlistTargetPlayer] = useState<PlayerDetail | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    playerA,
    playerB,
    processedStatsA,
    processedStatsB,
    loading,
    error,
    selectedComparisonPosition,
    setSelectedComparisonPosition,
    commonPositions,
    radarMetricsA,
    radarMetricsB,
    radarProfileTitle,
    radarProfileTitleB,
    contextLabel,
    activeMetricSections,
    keyBattles,
  } = usePlayerComparison(playerAId, playerBId, scope, seasonId, competitionId);

  // Early Returns
  if (loading) {
    return (
      <div className="scout-b2b-page-container" style={{ minHeight: '100vh', padding: '24px 20px' }}>
        <div
          className="scout-b2b-control-card"
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 600,
            background: 'var(--scout-surface-card)',
            borderRadius: '16px',
            border: '1px solid var(--scout-border-default)',
          }}
        >
          <div className="scout-loading-spinner" style={{ margin: '0 auto 16px' }} />
          <div>Loading head-to-head comparison matrix...</div>
        </div>
      </div>
    );
  }

  if (error || !playerA || !playerB) {
    return (
      <div className="scout-b2b-page-container" style={{ minHeight: '100vh', padding: '24px 20px' }}>
        <Notification
          variant="error"
          message={error || 'Unable to display player comparison'}
          style={{ marginBottom: '20px' }}
        />
        <button
          type="button"
          className="scout-sports-back-btn"
          onClick={onBackToSetup}
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
          <span>Back to Candidate Setup</span>
        </button>
      </div>
    );
  }

  const nameA = playerA.fullName || playerA.name;
  const nameB = playerB.fullName || playerB.name;

  return (
    <div
      className="scout-b2b-page-container"
      style={{ minHeight: '100vh', padding: '24px 20px', paddingBottom: '48px' }}
    >
      {/* 0. Top Navigation Topbar with Breadcrumbs & Action Controls */}
      <div className="scout-sports-topbar" style={{ marginBottom: '20px' }}>
        <div className="scout-detail-breadcrumb">
          <button
            type="button"
            className="scout-sports-back-btn"
            onClick={onBackToDetail}
            title={`Return to ${nameA}'s profile`}
            aria-label={`Return to ${nameA}'s profile`}
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
            <span>{nameA}</span>
          </button>
          <span style={{ color: 'var(--scout-border-default)', opacity: 0.6 }}>/</span>
          <span style={{ color: 'var(--scout-text-primary)', fontWeight: 700, fontSize: '13px' }}>
            Head-to-Head Comparison ({nameA} vs {nameB})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="scout-btn scout-btn-secondary"
            onClick={onBackToSetup}
            title="Adjust comparison scope or select a different player B"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Change Candidate / Scope</span>
          </button>

          <span
            style={{
              background: 'rgba(37, 99, 235, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '11.5px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚖️ Step 2 of 2: Head-to-Head
          </span>
        </div>
      </div>

      {/* 1. MATCHUP HERO HEADER */}
      <ComparisonHeroCards
        playerA={playerA}
        playerB={playerB}
        selectedComparisonPosition={selectedComparisonPosition}
        contextLabel={contextLabel}
        onShortlistPlayer={(player) => setShortlistTargetPlayer(player)}
      />

      {/* 2. 50-50 BALANCED GRID LAYOUT (Radar vs Key Battles) */}
      <ComparisonRadarSection
        radarMetricsA={radarMetricsA}
        radarMetricsB={radarMetricsB}
        nameA={nameA}
        nameB={nameB}
        selectedComparisonPosition={selectedComparisonPosition}
        radarProfileTitle={radarProfileTitle}
        radarProfileTitleB={radarProfileTitleB}
        commonPositions={commonPositions}
        onSelectPosition={(pos) => setSelectedComparisonPosition(pos)}
        keyBattles={keyBattles}
      />

      {/* 3. DETAILED STATISTICAL COMPARISON */}
      <ComparisonMetricsTable
        nameA={nameA}
        nameB={nameB}
        activeMetricSections={activeMetricSections}
        processedStatsA={processedStatsA}
        processedStatsB={processedStatsB}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Notification
          variant="success"
          mode="toast"
          message={toastMessage}
          autoDismissMs={3500}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* 4. Bottom Next Actions Bar (Evaluation Handoff) */}
      <ComparisonBottomBar
        playerA={playerA}
        playerB={playerB}
        onShortlistPlayer={(player) => setShortlistTargetPlayer(player)}
        onBackToSetup={onBackToSetup}
        onBackToDetail={onBackToDetail}
      />

      {/* Shortlist Modal */}
      <AddToShortlistModal
        isOpen={!!shortlistTargetPlayer}
        onClose={() => setShortlistTargetPlayer(null)}
        player={shortlistTargetPlayer}
        onSuccess={(shortlistName) => {
          setToastMessage(
            `Added ${shortlistTargetPlayer?.fullName || shortlistTargetPlayer?.name} to "${shortlistName}"`,
          );
        }}
      />
    </div>
  );
};
