import React, { useMemo } from 'react';
import type { SquadPlayerItem } from '../../types/squad.types';
import { FORMATION_DEFINITIONS, FORMATION_CONFIGS } from '../../utils/squad-placement.utils';
import type { FormationSlot } from '../../utils/squad-placement.utils';

export interface TacticalMiniPitchProps {
  formationCode?: string;
  players?: SquadPlayerItem[];
  occupiedSlotCodes?: string[];
  perspective?: boolean;
  showLabels?: boolean;
  dotSize?: number;
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
}

/**
 * TacticalMiniPitch
 * Reusable football pitch thumbnail with lush grass stripes, precise markings,
 * and 11 tactical coordinate dots (Attacking at TOP, GK at BOTTOM).
 */
export const TacticalMiniPitch: React.FC<TacticalMiniPitchProps> = ({
  formationCode = '4-3-3',
  players,
  occupiedSlotCodes,
  perspective = false,
  showLabels = false,
  dotSize = 7,
  className = '',
  style,
  width = '100%',
  height = '100%',
}) => {
  // Resolve formation slots
  const slots: FormationSlot[] = useMemo(() => {
    const key = formationCode || '4-3-3';
    const def = FORMATION_DEFINITIONS[key];
    if (def && def.slots && def.slots.length === 11) {
      return def.slots;
    }
    const rows = FORMATION_CONFIGS[key] || FORMATION_CONFIGS['4-3-3'] || FORMATION_CONFIGS['4-4-2'] || [];
    const flat = rows.flatMap((r) => r.slots);
    if (flat.length === 11) return flat;
    return FORMATION_DEFINITIONS['4-3-3']?.slots || [];
  }, [formationCode]);

  // Compute set of occupied slot codes
  const occupiedSet = useMemo(() => {
    const set = new Set<string>();
    if (occupiedSlotCodes) {
      occupiedSlotCodes.forEach((code) => set.add(code));
    }
    if (players) {
      players.forEach((p) => {
        if (p.role === 'STARTER' && p.slotCode) {
          set.add(p.slotCode);
        }
      });
    }
    return set;
  }, [players, occupiedSlotCodes]);

  const pitchContent = (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #103a22 0%, #0d301b 100%)',
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.035) 0px,
            rgba(255, 255, 255, 0.035) 12%,
            transparent 12%,
            transparent 24%
          ),
          linear-gradient(180deg, #124026 0%, #0b2b18 100%)
        `,
        borderRadius: '10px',
        border: '1.5px solid rgba(255, 255, 255, 0.28)',
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* SVG Pitch Markings */}
      <svg
        viewBox="0 0 300 400"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Outer Inset Boundary */}
        <rect
          x="12"
          y="12"
          width="276"
          height="376"
          fill="none"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.5"
          rx="3"
        />

        {/* Halfway Line */}
        <line
          x1="12"
          y1="200"
          x2="288"
          y2="200"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.5"
        />

        {/* Center Circle */}
        <circle
          cx="150"
          cy="200"
          r="38"
          fill="none"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.5"
        />
        {/* Center Spot */}
        <circle cx="150" cy="200" r="2.5" fill="rgba(255, 255, 255, 0.45)" />

        {/* TOP PENALTY AREA (Opposition Goal / Attack) */}
        <rect
          x="75"
          y="12"
          width="150"
          height="62"
          fill="none"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.5"
        />
        {/* Top Goal Box */}
        <rect
          x="110"
          y="12"
          width="80"
          height="24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.26)"
          strokeWidth="1.2"
        />
        {/* Top Penalty Arc */}
        <path
          d="M 125 74 A 36 36 0 0 0 175 74"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.2"
        />
        {/* Top Penalty Spot */}
        <circle cx="150" cy="54" r="2" fill="rgba(255, 255, 255, 0.45)" />

        {/* BOTTOM PENALTY AREA (Our Goal / GK) */}
        <rect
          x="75"
          y="326"
          width="150"
          height="62"
          fill="none"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.5"
        />
        {/* Bottom Goal Box */}
        <rect
          x="110"
          y="364"
          width="80"
          height="24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.26)"
          strokeWidth="1.2"
        />
        {/* Bottom Penalty Arc */}
        <path
          d="M 125 326 A 36 36 0 0 1 175 326"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.2"
        />
        {/* Bottom Penalty Spot */}
        <circle cx="150" cy="346" r="2" fill="rgba(255, 255, 255, 0.45)" />

        {/* Corner Arcs */}
        <path d="M 12 24 A 12 12 0 0 0 24 12" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
        <path d="M 276 12 A 12 12 0 0 0 288 24" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
        <path d="M 12 376 A 12 12 0 0 1 24 388" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
        <path d="M 276 388 A 12 12 0 0 1 288 376" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
      </svg>

      {/* 11 Tactical Coordinate Dots */}
      {slots.map((slot) => {
        const isOccupied =
          occupiedSet.has(slot.code) ||
          (slot.aliases && slot.aliases.some((alias) => occupiedSet.has(alias)));

        return (
          <div
            key={slot.code}
            title={`${slot.displayRole || slot.label} (${slot.requiredPosition})`}
            style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'auto',
              zIndex: 3,
            }}
          >
            {/* The Dot */}
            <div
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: isOccupied ? '#10b981' : '#ffffff',
                border: isOccupied ? '1.5px solid #ffffff' : '1px solid rgba(0, 0, 0, 0.35)',
                boxShadow: isOccupied
                  ? '0 0 8px rgba(16, 185, 129, 0.9), 0 1px 3px rgba(0, 0, 0, 0.4)'
                  : '0 0 4px rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.15s ease',
              }}
            />

            {/* Optional Position Label */}
            {showLabels && (
              <span
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  color: isOccupied ? '#a7f3d0' : 'rgba(255, 255, 255, 0.85)',
                  marginTop: '1px',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '0.02em',
                  pointerEvents: 'none',
                }}
              >
                {slot.displayRole || slot.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  if (perspective) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          perspective: '420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '92%',
            height: '95%',
            transform: 'rotateX(18deg)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.25s ease',
          }}
        >
          {pitchContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        ...style,
      }}
    >
      {pitchContent}
    </div>
  );
};
