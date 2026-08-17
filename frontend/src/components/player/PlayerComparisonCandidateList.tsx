import React from 'react';
import type { PlayerItem } from '../../types/player.types';

interface PlayerComparisonCandidateListProps {
  candidates: PlayerItem[];
  selectedCandidateId: string | null;
  loading: boolean;
  error: string | null;
  onSelectCandidate: (candidate: PlayerItem) => void;
}

const calculateAgeNumber = (dateOfBirth?: string | null): number | string => {
  if (!dateOfBirth) return 'N/A';
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return 'N/A';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const PlayerComparisonCandidateList: React.FC<PlayerComparisonCandidateListProps> = ({
  candidates,
  selectedCandidateId,
  loading,
  error,
  onSelectCandidate,
}) => {
  if (loading) {
    return (
      <div
        className="alert-banner"
        style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#93c5fd',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        ⌛ Loading comparison candidates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner alert-error" style={{ textAlign: 'center', padding: '20px' }}>
        ❌ {error}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div
        className="player-filters-card"
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
        <h4 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
          No eligible players found
        </h4>
        <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '480px', margin: '0 auto' }}>
          No candidates match the selected season, competition context, and search filters. Try adjusting your filters or switching scope.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper" style={{ marginBottom: '20px' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Cầu thủ (Player)</th>
            <th>Vị trí</th>
            <th>CLB Hiện Tại</th>
            <th>Quốc tịch</th>
            <th>Tuổi</th>
            <th>Chân thuận</th>
            <th>Chiều cao</th>
            <th style={{ textAlign: 'right' }}>Chọn So Sánh</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((player) => {
            const isSelected = player.id === selectedCandidateId;
            const age = calculateAgeNumber(player.dateOfBirth);

            return (
              <tr
                key={player.id}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.12)' : undefined,
                  transition: 'background 0.2s',
                }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {player.imageUrl ? (
                        <img
                          src={player.imageUrl}
                          alt={player.fullName}
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
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>
                        {player.fullName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {player.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </td>

                <td>
                  {player.primaryPosition ? (
                    <span className="status-badge status-active" style={{ fontSize: '11px' }}>
                      {player.primaryPosition}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>

                <td>
                  {player.currentTeam ? (
                    <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🛡️</span>
                      <span>{player.currentTeam.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Free Agent</span>
                  )}
                </td>

                <td>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    {player.nationality || '—'}
                  </span>
                </td>

                <td>
                  <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                    {age}
                  </span>
                </td>

                <td>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {player.preferredFoot || '—'}
                  </span>
                </td>

                <td>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {player.heightCm ? `${player.heightCm} cm` : '—'}
                  </span>
                </td>

                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className={`scout-btn scout-btn-sm ${
                      isSelected ? '' : 'scout-btn-secondary'
                    }`}
                    onClick={() => onSelectCandidate(player)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      background: isSelected ? '#38bdf8' : undefined,
                      color: isSelected ? '#090d16' : undefined,
                      fontWeight: 700,
                    }}
                  >
                    {isSelected ? '✓ Selected' : '+ Compare'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
