import React, { useState, useEffect } from 'react';
import type {
  PlayerDetail,
  PlayerSeasonStatisticItem,
  ComparisonScopeType,
} from '../types/player.types';
import { getPlayerByIdApi, getPlayerSeasonStatisticsApi } from '../services/player.service';

interface PlayerComparisonPageProps {
  playerAId: string;
  playerBId: string;
  scope: ComparisonScopeType;
  seasonId: string;
  competitionId?: string;
  onBackToSetup: () => void;
  onBackToDetail: () => void;
}

interface AggregatedStats {
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passesAttempted: number;
  passesCompleted: number;
  passAccuracy: number | null;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;

  // Derived Per-90 Metrics
  goalsPer90: number | null;
  assistsPer90: number | null;
  shotsPer90: number | null;
  shotsOnTargetPer90: number | null;
  passesPer90: number | null;
  keyPassesPer90: number | null;
  tacklesPer90: number | null;
  interceptionsPer90: number | null;
  duelsWonPer90: number | null;
}

const calculateAge = (dateOfBirth?: string | null): string => {
  if (!dateOfBirth) return '—';
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} yrs`;
};

const formatNumber = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number.isInteger(val) ? String(val) : val.toFixed(decimals);
};

export const PlayerComparisonPage: React.FC<PlayerComparisonPageProps> = ({
  playerAId,
  playerBId,
  scope,
  seasonId,
  competitionId,
  onBackToSetup,
  onBackToDetail,
}) => {
  const [playerA, setPlayerA] = useState<PlayerDetail | null>(null);
  const [playerB, setPlayerB] = useState<PlayerDetail | null>(null);
  const [statsA, setStatsA] = useState<PlayerSeasonStatisticItem[]>([]);
  const [statsB, setStatsB] = useState<PlayerSeasonStatisticItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getPlayerByIdApi(playerAId),
      getPlayerByIdApi(playerBId),
      getPlayerSeasonStatisticsApi(playerAId),
      getPlayerSeasonStatisticsApi(playerBId),
    ])
      .then(([pA, pB, sA, sB]) => {
        if (isMounted) {
          setPlayerA(pA);
          setPlayerB(pB);
          setStatsA(sA);
          setStatsB(sB);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Không thể tải dữ liệu so sánh cầu thủ');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [playerAId, playerBId]);

  // Aggregate or Extract Stats for a Player based on Scope
  const extractStats = (records: PlayerSeasonStatisticItem[]): AggregatedStats | null => {
    if (!records || records.length === 0) return null;

    let targetRecords: PlayerSeasonStatisticItem[] = [];

    if (scope === 'COMPETITION' && competitionId) {
      targetRecords = records.filter(
        (r) => r.season?.id === seasonId && r.competition?.id === competitionId,
      );
    } else {
      const targetSeasonRecord =
        statsA.find((s) => s.season?.id === seasonId) ||
        statsB.find((s) => s.season?.id === seasonId);
      const targetSeasonCode = targetSeasonRecord?.season?.seasonCode;

      targetRecords = records.filter(
        (r) =>
          r.season?.id === seasonId ||
          (targetSeasonCode && r.season?.seasonCode === targetSeasonCode),
      );
    }

    if (targetRecords.length === 0) return null;

    // Sum raw metrics
    let appearances = 0;
    let starts = 0;
    let minutesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let shots = 0;
    let shotsOnTarget = 0;
    let passesAttempted = 0;
    let passesCompleted = 0;
    let keyPasses = 0;
    let tackles = 0;
    let interceptions = 0;
    let duelsWon = 0;

    targetRecords.forEach((r) => {
      appearances += r.appearances || 0;
      starts += r.starts || 0;
      minutesPlayed += r.minutesPlayed || 0;
      goals += r.goals || 0;
      assists += r.assists || 0;
      shots += r.shots || 0;
      shotsOnTarget += r.shotsOnTarget || 0;
      passesAttempted += r.passesAttempted || 0;
      passesCompleted += r.passesCompleted || 0;
      keyPasses += r.keyPasses || 0;
      tackles += r.tackles || 0;
      interceptions += r.interceptions || 0;
      duelsWon += r.duelsWon || 0;
    });

    // Derived pass accuracy
    const passAccuracy =
      passesAttempted > 0
        ? Number(((passesCompleted / passesAttempted) * 100).toFixed(2))
        : null;

    // Derived per 90 metrics (exact formula: rawMetric * 90 / totalMinutes)
    const calcPer90 = (val: number): number | null => {
      if (minutesPlayed <= 0) return null;
      return Number(((val * 90) / minutesPlayed).toFixed(2));
    };

    return {
      appearances,
      starts,
      minutesPlayed,
      goals,
      assists,
      shots,
      shotsOnTarget,
      passesAttempted,
      passesCompleted,
      passAccuracy,
      keyPasses,
      tackles,
      interceptions,
      duelsWon,
      goalsPer90: calcPer90(goals),
      assistsPer90: calcPer90(assists),
      shotsPer90: calcPer90(shots),
      shotsOnTargetPer90: calcPer90(shotsOnTarget),
      passesPer90: calcPer90(passesAttempted),
      keyPassesPer90: calcPer90(keyPasses),
      tacklesPer90: calcPer90(tackles),
      interceptionsPer90: calcPer90(interceptions),
      duelsWonPer90: calcPer90(duelsWon),
    };
  };

  const processedStatsA = extractStats(statsA);
  const processedStatsB = extractStats(statsB);

  // Context Info Labels
  const activeSeasonRecord =
    statsA.find((s) => s.season?.id === seasonId) ||
    statsB.find((s) => s.season?.id === seasonId);
  const seasonName = activeSeasonRecord?.season?.seasonCode || 'Season';

  let contextLabel = `${seasonName} · All Competitions`;
  if (scope === 'COMPETITION') {
    const compRecord =
      statsA.find((s) => s.competition?.id === competitionId) ||
      statsB.find((s) => s.competition?.id === competitionId);
    contextLabel = `${seasonName} · ${compRecord?.competition?.name || 'Specific Competition'}`;
  }

  if (loading) {
    return (
      <div className="player-comparison-page" style={{ padding: '12px 0' }}>
        <div
          className="scout-b2b-control-card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          ⌛ Loading side-by-side comparison data...
        </div>
      </div>
    );
  }

  if (error || !playerA || !playerB) {
    return (
      <div className="player-comparison-page" style={{ padding: '12px 0' }}>
        <div
          className="scout-b2b-alert-error"
          style={{ marginBottom: '20px', fontSize: '13.5px' }}
        >
          ⚠️ {error || 'Không thể hiển thị thông tin so sánh'}
        </div>
        <button
          type="button"
          className="scout-b2b-btn scout-b2b-btn-secondary"
          onClick={onBackToSetup}
        >
          ← Back to Setup
        </button>
      </div>
    );
  }

  const renderMetricRow = (
    label: string,
    valA: number | null | undefined,
    valB: number | null | undefined,
    isPercentage = false,
    higherIsBetter = true,
  ) => {
    let highlightA = false;
    let highlightB = false;

    if (valA !== null && valA !== undefined && valB !== null && valB !== undefined) {
      if (valA > valB) {
        highlightA = higherIsBetter;
        highlightB = !higherIsBetter;
      } else if (valB > valA) {
        highlightB = higherIsBetter;
        highlightA = !higherIsBetter;
      }
    }

    const textA = valA !== null && valA !== undefined ? `${formatNumber(valA)}${isPercentage ? '%' : ''}` : '—';
    const textB = valB !== null && valB !== undefined ? `${formatNumber(valB)}${isPercentage ? '%' : ''}` : '—';

    return (
      <tr key={label} className="scout-b2b-table-row">
        {/* Player A Metric Value */}
        <td
          style={{
            textAlign: 'right',
            fontWeight: highlightA ? 800 : 600,
            color: highlightA ? '#15803d' : '#334155',
            background: highlightA ? '#f0fdf4' : undefined,
            width: '35%',
            fontSize: '13.5px',
            padding: '10px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {textA} {highlightA && <span style={{ color: '#16a34a', marginLeft: '4px' }}>★</span>}
        </td>

        {/* Center Metric Title */}
        <td
          style={{
            textAlign: 'center',
            fontWeight: 700,
            color: '#475569',
            fontSize: '11.5px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: '#f8fafc',
            width: '30%',
            padding: '10px 12px',
            borderBottom: '1px solid #f1f5f9',
            borderLeft: '1px solid #f1f5f9',
            borderRight: '1px solid #f1f5f9',
          }}
        >
          {label}
        </td>

        {/* Player B Metric Value */}
        <td
          style={{
            textAlign: 'left',
            fontWeight: highlightB ? 800 : 600,
            color: highlightB ? '#15803d' : '#334155',
            background: highlightB ? '#f0fdf4' : undefined,
            width: '35%',
            fontSize: '13.5px',
            padding: '10px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {highlightB && <span style={{ color: '#16a34a', marginRight: '4px' }}>★</span>}
          {textB}
        </td>
      </tr>
    );
  };

  const nameA = playerA.fullName || playerA.name;
  const nameB = playerB.fullName || playerB.name;

  return (
    <div className="player-comparison-page">
      {/* Top Header & Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="scout-b2b-btn scout-b2b-btn-secondary"
            onClick={onBackToSetup}
            style={{
              height: '36px',
              padding: '0 14px',
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ← Change Candidate / Scope
          </button>
          <button
            type="button"
            className="scout-b2b-btn scout-b2b-btn-secondary"
            onClick={onBackToDetail}
            style={{
              height: '36px',
              padding: '0 14px',
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            👤 Back to {nameA}
          </button>
        </div>

        {/* Active Scope Pill */}
        <div
          style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          ⚖️ Context: {contextLabel}
        </div>
      </div>

      {/* Side-by-Side Profiles Header Card */}
      <div
        className="scout-b2b-control-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: '#ffffff',
          border: '1px solid #bfdbfe',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Player A Profile (Left) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#eff6ff',
                border: '2px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
              }}
            >
              {playerA.imageUrl ? (
                <img
                  src={playerA.imageUrl}
                  alt={nameA}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                '⚽'
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#2563eb',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Player A
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {nameA}
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  color: '#64748b',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <span>🛡️ {playerA.currentTeam?.name || 'Free Agent'}</span>
                <span>·</span>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {playerA.primaryPosition || 'Player'}
                </span>
              </div>
            </div>
          </div>

          {/* VS Center Badge */}
          <div
            style={{
              fontWeight: 900,
              fontSize: '16px',
              color: '#475569',
              padding: '6px 16px',
              borderRadius: '999px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            VS
          </div>

          {/* Player B Profile (Right) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              justifyContent: 'flex-end',
              textAlign: 'right',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#d97706',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Player B
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {nameB}
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  color: '#64748b',
                  marginTop: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {playerB.primaryPosition || 'Player'}
                </span>
                <span>·</span>
                <span>🛡️ {playerB.currentTeam?.name || 'Free Agent'}</span>
              </div>
            </div>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
              }}
            >
              {playerB.imageUrl ? (
                <img
                  src={playerB.imageUrl}
                  alt={nameB}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                '⚽'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head Stats Comparison Table */}
      <div
        className="scout-b2b-control-card"
        style={{ padding: 0, overflow: 'hidden', marginBottom: '24px', border: '1px solid #bfdbfe' }}
      >
        <table className="scout-b2b-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th
                style={{
                  textAlign: 'right',
                  width: '35%',
                  color: '#2563eb',
                  fontWeight: 900,
                  fontSize: '14px',
                  padding: '12px 16px',
                }}
              >
                {nameA}
              </th>
              <th
                style={{
                  textAlign: 'center',
                  width: '30%',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '12px',
                  padding: '12px 12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Metric
              </th>
              <th
                style={{
                  textAlign: 'left',
                  width: '35%',
                  color: '#d97706',
                  fontWeight: 900,
                  fontSize: '14px',
                  padding: '12px 16px',
                }}
              >
                {nameB}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Section 1: Bio & Physical Comparison */}
            <tr style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  padding: '8px',
                }}
              >
                📋 PROFILE & BIOMETRICS
              </td>
            </tr>
            <tr className="scout-b2b-table-row">
              <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {calculateAge(playerA.dateOfBirth)}
              </td>
              <td style={{ textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: '11.5px', background: '#f8fafc', padding: '10px 12px' }}>
                AGE
              </td>
              <td style={{ textAlign: 'left', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {calculateAge(playerB.dateOfBirth)}
              </td>
            </tr>
            <tr className="scout-b2b-table-row">
              <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {playerA.nationality || '—'}
              </td>
              <td style={{ textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: '11.5px', background: '#f8fafc', padding: '10px 12px' }}>
                NATIONALITY
              </td>
              <td style={{ textAlign: 'left', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {playerB.nationality || '—'}
              </td>
            </tr>
            <tr className="scout-b2b-table-row">
              <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {playerA.preferredFoot || '—'}
              </td>
              <td style={{ textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: '11.5px', background: '#f8fafc', padding: '10px 12px' }}>
                PREFERRED FOOT
              </td>
              <td style={{ textAlign: 'left', color: '#0f172a', fontWeight: 600, fontSize: '13.5px', padding: '10px 16px' }}>
                {playerB.preferredFoot || '—'}
              </td>
            </tr>
            {renderMetricRow('HEIGHT (CM)', playerA.heightCm, playerB.heightCm)}

            {/* Section 2: Playing Time */}
            <tr style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  padding: '8px',
                }}
              >
                ⏱️ PLAYING TIME & PARTICIPATION
              </td>
            </tr>
            {renderMetricRow('MATCHES', processedStatsA?.appearances, processedStatsB?.appearances)}
            {renderMetricRow('STARTS', processedStatsA?.starts, processedStatsB?.starts)}
            {renderMetricRow('MINUTES PLAYED', processedStatsA?.minutesPlayed, processedStatsB?.minutesPlayed)}

            {/* Section 3: Attacking Output */}
            <tr style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  padding: '8px',
                }}
              >
                ⚡ ATTACKING OUTPUT
              </td>
            </tr>
            {renderMetricRow('GOALS', processedStatsA?.goals, processedStatsB?.goals)}
            {renderMetricRow('ASSISTS', processedStatsA?.assists, processedStatsB?.assists)}
            {renderMetricRow('SHOTS', processedStatsA?.shots, processedStatsB?.shots)}
            {renderMetricRow('SHOTS ON TARGET', processedStatsA?.shotsOnTarget, processedStatsB?.shotsOnTarget)}
            {renderMetricRow('GOALS / 90', processedStatsA?.goalsPer90, processedStatsB?.goalsPer90)}
            {renderMetricRow('ASSISTS / 90', processedStatsA?.assistsPer90, processedStatsB?.assistsPer90)}
            {renderMetricRow('SHOTS / 90', processedStatsA?.shotsPer90, processedStatsB?.shotsPer90)}
            {renderMetricRow('SHOTS ON TARGET / 90', processedStatsA?.shotsOnTargetPer90, processedStatsB?.shotsOnTargetPer90)}

            {/* Section 4: Passing & Playmaking */}
            <tr style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  padding: '8px',
                }}
              >
                🎯 PASSING & CREATIVITY
              </td>
            </tr>
            {renderMetricRow('PASSES ATTEMPTED', processedStatsA?.passesAttempted, processedStatsB?.passesAttempted)}
            {renderMetricRow('PASSES COMPLETED', processedStatsA?.passesCompleted, processedStatsB?.passesCompleted)}
            {renderMetricRow('PASS ACCURACY', processedStatsA?.passAccuracy, processedStatsB?.passAccuracy, true)}
            {renderMetricRow('KEY PASSES', processedStatsA?.keyPasses, processedStatsB?.keyPasses)}
            {renderMetricRow('PASSES / 90', processedStatsA?.passesPer90, processedStatsB?.passesPer90)}
            {renderMetricRow('KEY PASSES / 90', processedStatsA?.keyPassesPer90, processedStatsB?.keyPassesPer90)}

            {/* Section 5: Defending & Duels */}
            <tr style={{ background: '#eff6ff', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe' }}>
              <td
                colSpan={3}
                style={{
                  textAlign: 'center',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  padding: '8px',
                }}
              >
                🛡️ DEFENDING & DUELS
              </td>
            </tr>
            {renderMetricRow('TACKLES', processedStatsA?.tackles, processedStatsB?.tackles)}
            {renderMetricRow('INTERCEPTIONS', processedStatsA?.interceptions, processedStatsB?.interceptions)}
            {renderMetricRow('DUELS WON', processedStatsA?.duelsWon, processedStatsB?.duelsWon)}
            {renderMetricRow('TACKLES / 90', processedStatsA?.tacklesPer90, processedStatsB?.tacklesPer90)}
            {renderMetricRow('INTERCEPTIONS / 90', processedStatsA?.interceptionsPer90, processedStatsB?.interceptionsPer90)}
            {renderMetricRow('DUELS WON / 90', processedStatsA?.duelsWonPer90, processedStatsB?.duelsWonPer90)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
