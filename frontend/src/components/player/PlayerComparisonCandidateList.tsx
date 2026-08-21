import React from "react";
import type { PlayerItem } from "../../types/player.types";

interface PlayerComparisonCandidateListProps {
  candidates: PlayerItem[];
  selectedCandidateId: string | null;
  loading: boolean;
  error: string | null;
  onSelectCandidate: (candidate: PlayerItem) => void;
}

const calculateAgeNumber = (dateOfBirth?: string | null): number | string => {
  if (!dateOfBirth) return "—";
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Synchronized role colors matching position.utils.ts
const getPositionBadgeStyle = (posCode?: string | null): { bg: string; text: string; border: string } => {
  if (!posCode) return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  const upper = posCode.trim().toUpperCase();
  if (upper === 'GK') {
    return { bg: '#dcfce7', text: '#15803d', border: '#86efac' }; // GK: green
  }
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'WB'].includes(upper)) {
    return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }; // DEF: blue
  }
  if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM'].includes(upper)) {
    return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }; // MID: amber/yellow
  }
  if (['ST', 'CF', 'LW', 'RW', 'FW'].includes(upper)) {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' }; // ATT: rose/red
  }
  return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
};

export const PlayerComparisonCandidateList: React.FC<
  PlayerComparisonCandidateListProps
> = ({
  candidates,
  selectedCandidateId,
  loading,
  error,
  onSelectCandidate,
}) => {
  if (loading) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '40px 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        ⌛ Loading comparison candidates...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '16px 20px',
          borderRadius: '16px',
          marginBottom: '24px',
          fontSize: '13px',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        ⚠️ {error}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          marginBottom: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
        <h4
          style={{
            color: '#0f172a',
            fontSize: '16px',
            fontWeight: 800,
            marginBottom: '6px',
          }}
        >
          No compatible players found
        </h4>
        <p
          style={{
            color: '#64748b',
            fontSize: '13px',
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          No candidates match the selected season, competition context, compatible positions, and search filters. Try adjusting your filters or switching scope.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        marginBottom: '24px',
      }}
    >
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                background: 'rgba(248, 250, 252, 0.9)',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 16px',
                  width: '32%',
                }}
              >
                Cầu thủ (Player)
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Vị trí
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '18%',
                }}
              >
                CLB Hiện Tại
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '12%',
                }}
              >
                Quốc tịch
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '8%',
                }}
              >
                Tuổi
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Chân thuận
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Chiều cao
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#64748b',
                  padding: '14px 16px',
                  width: '12%',
                  textAlign: 'center',
                }}
              >
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((player) => {
              const isSelected = player.id === selectedCandidateId;
              const age = calculateAgeNumber(player.dateOfBirth);
              const badgeStyle = getPositionBadgeStyle(player.primaryPosition);

              return (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => onSelectCandidate(player)}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239, 246, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Player Name & ID */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
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
                        <div
                          style={{
                            fontWeight: 900,
                            color: isSelected ? '#1d4ed8' : '#0f172a',
                            fontSize: '14px',
                            lineHeight: 1.3,
                          }}
                        >
                          {player.fullName}
                        </div>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: '#94a3b8',
                            marginTop: '2px',
                          }}
                        >
                          ID: {player.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Position Badge with synchronized role colors */}
                  <td style={{ padding: '12px 12px' }}>
                    {player.primaryPosition ? (
                      <span
                        style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`,
                          fontWeight: 900,
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          display: 'inline-block',
                          textAlign: 'center',
                          minWidth: '38px',
                        }}
                      >
                        {player.primaryPosition}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Club */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {player.currentTeam ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🛡️</span>
                        <span>{player.currentTeam.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Free Agent</span>
                    )}
                  </td>

                  {/* Nationality */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {player.nationality || '—'}
                  </td>

                  {/* Age */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    {age}
                  </td>

                  {/* Preferred Foot */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    {player.preferredFoot || '—'}
                  </td>

                  {/* Height */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    {player.heightCm ? `${player.heightCm} cm` : '—'}
                  </td>

                  {/* Compare Action Button */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(player);
                      }}
                      style={{
                        background: isSelected ? '#15803d' : '#2563eb',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        boxShadow: isSelected
                          ? '0 2px 4px rgba(21, 128, 61, 0.25)'
                          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        transition: 'all 0.15s ease',
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
    </div>
  );
};
