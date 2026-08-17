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
  if (!dateOfBirth) return 'N/A';
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return 'N/A';
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
  const activeSeasonRecord = statsA.find((s) => s.season?.id === seasonId) || statsB.find((s) => s.season?.id === seasonId);
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
      <div className="player-comparison-page">
        <div
          className="alert-banner"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          ⌛ Loading side-by-side comparison data...
        </div>
      </div>
    );
  }

  if (error || !playerA || !playerB) {
    return (
      <div className="player-comparison-page">
        <div className="alert-banner alert-error" style={{ marginBottom: '20px' }}>
          ❌ {error || 'Không thể hiển thị thông tin so sánh'}
        </div>
        <button type="button" className="scout-btn scout-btn-secondary" onClick={onBackToSetup}>
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
      <tr key={label}>
        <td
          style={{
            textAlign: 'right',
            fontWeight: highlightA ? 800 : 500,
            color: highlightA ? '#4ade80' : '#e2e8f0',
            background: highlightA ? 'rgba(34, 197, 94, 0.1)' : undefined,
            width: '35%',
            fontSize: '14px',
          }}
        >
          {textA} {highlightA && '★'}
        </td>
        <td
          style={{
            textAlign: 'center',
            fontWeight: 600,
            color: '#94a3b8',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: 'rgba(15, 23, 42, 0.4)',
            width: '30%',
          }}
        >
          {label}
        </td>
        <td
          style={{
            textAlign: 'left',
            fontWeight: highlightB ? 800 : 500,
            color: highlightB ? '#4ade80' : '#e2e8f0',
            background: highlightB ? 'rgba(34, 197, 94, 0.1)' : undefined,
            width: '35%',
            fontSize: '14px',
          }}
        >
          {highlightB && '★ '}
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
            className="scout-btn scout-btn-secondary scout-btn-sm"
            onClick={onBackToSetup}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            ← Change Candidate / Scope
          </button>
          <button
            type="button"
            className="scout-btn scout-btn-secondary scout-btn-sm"
            onClick={onBackToDetail}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            👤 Back to {nameA}
          </button>
        </div>

        {/* Active Scope Pill */}
        <div
          className="role-pill"
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          ⚖️ Context: {contextLabel}
        </div>
      </div>

      {/* Side-by-Side Profiles Header Card */}
      <div
        className="player-filters-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center' }}>
          {/* Player A Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '2px solid rgba(56, 189, 248, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
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
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                Player A
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                {nameA}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                🛡️ {playerA.currentTeam?.name || 'Free Agent'} ·{' '}
                <span className="role-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
                  {playerA.primaryPosition || 'Player'}
                </span>
              </div>
            </div>
          </div>

          {/* VS Center Badge */}
          <div
            style={{
              fontWeight: 900,
              fontSize: '20px',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            VS
          </div>

          {/* Player B Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end', textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                Player B
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                {nameB}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                <span className="role-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
                  {playerB.primaryPosition || 'Player'}
                </span>{' '}
                · 🛡️ {playerB.currentTeam?.name || 'Free Agent'}
              </div>
            </div>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '2px solid rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                overflow: 'hidden',
                flexShrink: 0,
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

      {/* Head-to-Head Stats Comparison Tables */}
      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <table className="admin-table" style={{ margin: 0 }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
              <th style={{ textAlign: 'right', width: '35%', color: '#38bdf8' }}>{nameA}</th>
              <th style={{ textAlign: 'center', width: '30%' }}>Metric</th>
              <th style={{ textAlign: 'left', width: '35%', color: '#f59e0b' }}>{nameB}</th>
            </tr>
          </thead>
          <tbody>
            {/* Section 1: Bio & Physical Comparison */}
            <tr style={{ background: 'rgba(56, 189, 248, 0.06)' }}>
              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8', fontSize: '12px', letterSpacing: '0.05em' }}>
                📋 PROFILE & BIOMETRICS
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', color: '#cbd5e1' }}>{calculateAge(playerA.dateOfBirth)}</td>
              <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>AGE</td>
              <td style={{ textAlign: 'left', color: '#cbd5e1' }}>{calculateAge(playerB.dateOfBirth)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', color: '#cbd5e1' }}>{playerA.nationality || '—'}</td>
              <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>NATIONALITY</td>
              <td style={{ textAlign: 'left', color: '#cbd5e1' }}>{playerB.nationality || '—'}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', color: '#cbd5e1' }}>{playerA.preferredFoot || '—'}</td>
              <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>PREFERRED FOOT</td>
              <td style={{ textAlign: 'left', color: '#cbd5e1' }}>{playerB.preferredFoot || '—'}</td>
            </tr>
            {renderMetricRow('HEIGHT (CM)', playerA.heightCm, playerB.heightCm)}

            {/* Section 2: Playing Time */}
            <tr style={{ background: 'rgba(56, 189, 248, 0.06)' }}>
              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8', fontSize: '12px', letterSpacing: '0.05em' }}>
                ⏱️ PLAYING TIME & PARTICIPATION
              </td>
            </tr>
            {renderMetricRow('MATCHES', processedStatsA?.appearances, processedStatsB?.appearances)}
            {renderMetricRow('STARTS', processedStatsA?.starts, processedStatsB?.starts)}
            {renderMetricRow('MINUTES PLAYED', processedStatsA?.minutesPlayed, processedStatsB?.minutesPlayed)}

            {/* Section 3: Attacking Output */}
            <tr style={{ background: 'rgba(56, 189, 248, 0.06)' }}>
              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8', fontSize: '12px', letterSpacing: '0.05em' }}>
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
            <tr style={{ background: 'rgba(56, 189, 248, 0.06)' }}>
              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8', fontSize: '12px', letterSpacing: '0.05em' }}>
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
            <tr style={{ background: 'rgba(56, 189, 248, 0.06)' }}>
              <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, color: '#38bdf8', fontSize: '12px', letterSpacing: '0.05em' }}>
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
