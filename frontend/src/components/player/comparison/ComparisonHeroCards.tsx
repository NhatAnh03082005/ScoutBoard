import React from 'react';
import type { PlayerDetail } from '../../../types/player.types';
import { getNationalityFlagUrl } from '../../../utils/nationality-flag.util';
import { calculateAge } from './comparison.utils';

export interface ComparisonHeroCardsProps {
  playerA: PlayerDetail;
  playerB: PlayerDetail;
  selectedComparisonPosition: string;
  contextLabel: string;
  onShortlistPlayer: (player: PlayerDetail) => void;
}

export const ComparisonHeroCards: React.FC<ComparisonHeroCardsProps> = ({
  playerA,
  playerB,
  selectedComparisonPosition,
  contextLabel,
  onShortlistPlayer,
}) => {
  const nameA = playerA.fullName || playerA.name;
  const nameB = playerB.fullName || playerB.name;
  const flagA = getNationalityFlagUrl(playerA.nationality, playerA.nationalityFlagUrl);
  const flagB = getNationalityFlagUrl(playerB.nationality, playerB.nationalityFlagUrl);
  const ageA = playerA.dateOfBirth ? calculateAge(playerA.dateOfBirth) : null;
  const ageB = playerB.dateOfBirth ? calculateAge(playerB.dateOfBirth) : null;

  const itemsA: React.ReactNode[] = [];
  if (playerA.nationality) {
    itemsA.push(
      <span key="nat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {flagA && (
          <img
            src={flagA}
            alt=""
            style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
          />
        )}
        <span>{playerA.nationality.toUpperCase()}</span>
      </span>
    );
  }
  if (ageA && ageA !== '— YRS') {
    itemsA.push(<span key="age">{ageA}</span>);
  }
  if (playerA.heightCm != null) {
    itemsA.push(<span key="height">{playerA.heightCm} CM</span>);
  }
  if (playerA.weightKg != null) {
    itemsA.push(<span key="weight">{playerA.weightKg} KG</span>);
  }

  const itemsB: React.ReactNode[] = [];
  if (playerB.heightCm != null) {
    itemsB.push(<span key="height">{playerB.heightCm} CM</span>);
  }
  if (playerB.weightKg != null) {
    itemsB.push(<span key="weight">{playerB.weightKg} KG</span>);
  }
  if (ageB && ageB !== '— YRS') {
    itemsB.push(<span key="age">{ageB}</span>);
  }
  if (playerB.nationality) {
    itemsB.push(
      <span key="nat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {flagB && (
          <img
            src={flagB}
            alt=""
            style={{ width: '14px', height: '10px', objectFit: 'cover', borderRadius: '1px' }}
          />
        )}
        <span>{playerB.nationality.toUpperCase()}</span>
      </span>
    );
  }

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="scout-matchup-hero-grid">
        {/* PLAYER A (Left Aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#1e293b',
              border: '1.5px solid rgba(59, 130, 246, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
              >
                <rect width="100" height="100" fill="#1e293b" />
                <circle cx="50" cy="38" r="18" fill="#64748b" />
                <path
                  d="M16 90C16 68 30 57 50 57C70 57 84 68 84 90V100H16V90Z"
                  fill="#64748b"
                />
              </svg>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  background: 'rgba(37, 99, 235, 0.2)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                TARGET (PLAYER A)
              </span>
            </div>
            {/* Player Name */}
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                fontStyle: 'italic',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                color: '#60a5fa',
                lineHeight: 1.1,
              }}
            >
              {nameA}
            </div>

            {/* Subheader: Club, Position, Jersey */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                {playerA.currentTeam?.logoUrl && (
                  <img
                    src={playerA.currentTeam.logoUrl}
                    alt=""
                    style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                  />
                )}
                <span>{playerA.currentTeam?.name || 'FREE AGENT'}</span>
              </span>
              <span
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  padding: '1px 7px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                {selectedComparisonPosition}
              </span>
              {playerA.shirtNumber && (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                  #{playerA.shirtNumber}
                </span>
              )}
              <button
                type="button"
                onClick={() => onShortlistPlayer(playerA)}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#93c5fd',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  textTransform: 'uppercase',
                }}
                title="Add to Shortlist"
              >
                <span>+</span>
                <span>Shortlist</span>
              </button>
            </div>

            {/* Player Bio details */}
            {itemsA.length > 0 && (
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                {itemsA.map((node, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span style={{ color: '#64748b' }}>•</span>}
                    {node}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER VS BADGE */}
        <div className="scout-matchup-vs-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontWeight: 900,
              padding: '4px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              letterSpacing: '0.08em',
            }}
          >
            VS
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textAlign: 'center',
              marginTop: '4px',
            }}
          >
            {contextLabel}
          </div>
        </div>

        {/* PLAYER B (Right Aligned) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '16px',
            textAlign: 'right',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fde68a',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                CANDIDATE (PLAYER B)
              </span>
            </div>
            {/* Player Name */}
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                fontStyle: 'italic',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                color: '#fbbf24',
                lineHeight: 1.1,
              }}
            >
              {nameB}
            </div>

            {/* Subheader: Club, Position, Jersey */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '4px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => onShortlistPlayer(playerB)}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fde68a',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  textTransform: 'uppercase',
                }}
                title="Add to Shortlist"
              >
                <span>+</span>
                <span>Shortlist</span>
              </button>
              {playerB.shirtNumber && (
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                  #{playerB.shirtNumber}
                </span>
              )}
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '1px 7px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                {selectedComparisonPosition}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                {playerB.currentTeam?.logoUrl && (
                  <img
                    src={playerB.currentTeam.logoUrl}
                    alt=""
                    style={{ width: '15px', height: '15px', objectFit: 'contain' }}
                  />
                )}
                <span>{playerB.currentTeam?.name || 'FREE AGENT'}</span>
              </span>
            </div>

            {/* Player Bio details */}
            {itemsB.length > 0 && (
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                {itemsB.map((node, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span style={{ color: '#64748b' }}>•</span>}
                    {node}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#1e293b',
              border: '1.5px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
              >
                <rect width="100" height="100" fill="#1e293b" />
                <circle cx="50" cy="38" r="18" fill="#64748b" />
                <path
                  d="M16 90C16 68 30 57 50 57C70 57 84 68 84 90V100H16V90Z"
                  fill="#64748b"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
