import React from "react";
import type { PlayerItem } from "../../types/player.types";
import { getNationalityFlagUrl } from "../../utils/nationality-flag.util";

interface PlayerComparisonCandidateListProps {
  candidates: PlayerItem[];
  selectedCandidateId: string | null;
  loading: boolean;
  error: string | null;
  onSelectCandidate: (candidate: PlayerItem) => void;
}

const calculateAgeNumber = (dateOfBirth?: string | null): number | string => {
  if (!dateOfBirth) return "";
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return "";
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
  if (!posCode) return { bg: 'rgba(255, 255, 255, 0.08)', text: 'var(--scout-text-secondary)', border: 'var(--scout-border-default)' };
  const upper = posCode.trim().toUpperCase();
  if (upper === 'GK') {
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' }; // GK: green
  }
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'WB'].includes(upper)) {
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' }; // DEF: blue
  }
  if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM', 'AM'].includes(upper)) {
    return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' }; // MID: amber/yellow
  }
  if (['ST', 'CF', 'LW', 'RW', 'FW'].includes(upper)) {
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' }; // ATT: rose/red
  }
  return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
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
        role="status"
        aria-live="polite"
        style={{
          background: 'var(--scout-surface-card)',
          border: '1px solid var(--scout-border-default)',
          borderRadius: '16px',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--scout-text-secondary)',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '24px',
        }}
      >
        ⏳ Loading compatible comparison candidates...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
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
          background: 'var(--scout-surface-card)',
          border: '1px dashed var(--scout-border-default)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
        <h4
          style={{
            color: 'var(--scout-text-primary)',
            fontSize: '16px',
            fontWeight: 800,
            marginBottom: '6px',
          }}
        >
          No compatible players found
        </h4>
        <p
          style={{
            color: 'var(--scout-text-secondary)',
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
      role="region"
      aria-label="Compatible Candidates for Player B"
      style={{
        background: 'var(--scout-surface-card)',
        border: '1px solid var(--scout-border-default)',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        marginBottom: '24px',
      }}
    >
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                background: 'var(--scout-bg-subtle)',
                borderBottom: '1px solid var(--scout-border-default)',
              }}
            >
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 16px',
                  width: '32%',
                }}
              >
                Candidate Player (B)
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Position
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '18%',
                }}
              >
                Current Club
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '12%',
                }}
              >
                Nationality
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '8%',
                }}
              >
                Age
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Weight
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 12px',
                  width: '10%',
                }}
              >
                Height
              </th>
              <th
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--scout-text-muted)',
                  padding: '14px 16px',
                  width: '14%',
                  textAlign: 'center',
                }}
              >
                Action
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
                  aria-selected={isSelected}
                  style={{
                    borderBottom: '1px solid var(--scout-border-subtle)',
                    background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '4px solid #f59e0b' : '4px solid transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  }}
                  onClick={() => onSelectCandidate(player)}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
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
                          background: 'var(--scout-surface-input)',
                          border: isSelected ? '2px solid #f59e0b' : '1px solid var(--scout-border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
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
                            color: isSelected ? '#fbbf24' : 'var(--scout-text-primary)',
                            fontSize: '14px',
                            lineHeight: 1.3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>{player.fullName}</span>
                          {isSelected && (
                            <span
                              style={{
                                background: '#f59e0b',
                                color: '#0f172a',
                                fontSize: '10px',
                                fontWeight: 900,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Player B
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            color: 'var(--scout-text-muted)',
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
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--scout-text-secondary)' }}>
                    {player.currentTeam ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {player.currentTeam.logoUrl ? (
                          <img
                            src={player.currentTeam.logoUrl}
                            alt=""
                            style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                          />
                        ) : (
                          <span>🛡️</span>
                        )}
                        <span>{player.currentTeam.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--scout-text-muted)' }}>Free Agent</span>
                    )}
                  </td>

                  {/* Nationality */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--scout-text-secondary)' }}>
                    {player.nationality ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(() => {
                          const flag = getNationalityFlagUrl(player.nationality, player.nationalityFlagUrl);
                          return flag ? (
                            <img
                              src={flag}
                              alt=""
                              style={{ width: '16px', height: '11px', objectFit: 'cover', borderRadius: '2px' }}
                            />
                          ) : null;
                        })()}
                        <span>{player.nationality}</span>
                      </div>
                    ) : null}
                  </td>

                  {/* Age */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--scout-text-primary)' }}>
                    {age}
                  </td>

                  {/* Weight */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--scout-text-secondary)' }}>
                    {player.weightKg != null ? `${player.weightKg} kg` : '—'}
                  </td>

                  {/* Height */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--scout-text-secondary)' }}>
                    {player.heightCm != null ? `${player.heightCm} cm` : '—'}
                  </td>

                  {/* Compare Action Button */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(player);
                      }}
                      aria-label={`Select ${player.fullName} as Player B`}
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'var(--scout-surface-input)',
                        color: isSelected ? '#0f172a' : 'var(--scout-text-primary)',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        padding: '7px 14px',
                        borderRadius: '10px',
                        boxShadow: isSelected
                          ? '0 2px 8px rgba(245, 158, 11, 0.4)'
                          : 'none',
                        border: isSelected ? '1px solid #f59e0b' : '1px solid var(--scout-border-default)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? '✓ Player B' : '+ Select (B)'}
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
