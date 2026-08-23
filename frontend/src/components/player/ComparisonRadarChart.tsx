import React, { useState } from 'react';
import type { RadarMetric } from '../../utils/radar.utils';

interface ComparisonRadarChartProps {
  metricsA: RadarMetric[];
  metricsB: RadarMetric[];
  playerAName: string;
  playerBName: string;
  playerAHexColor?: string;
  playerBHexColor?: string;
  selectedPosition: string;
  radarTitle?: string;
  commonPositions?: string[];
  onSelectPosition?: (pos: string) => void;
}

export const ComparisonRadarChart: React.FC<ComparisonRadarChartProps> = ({
  metricsA,
  metricsB,
  playerAName,
  playerBName,
  playerAHexColor = '#3b82f6',
  playerBHexColor = '#f59e0b',
  selectedPosition,
  radarTitle = 'TACTICAL PROFILE',
  commonPositions = [],
  onSelectPosition,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const size = 440;
  const center = size / 2; // 220
  const radius = 136;
  const numAxes = Math.max(metricsA.length, metricsB.length) || 5;
  const angleStep = (Math.PI * 2) / numAxes;
  const startAngle = -Math.PI / 2;

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Calculate Metrics Won
  let metricsWonA = 0;
  let metricsWonB = 0;
  metricsA.forEach((mA, idx) => {
    const valB = metricsB[idx]?.value ?? 0;
    if (mA.value > valB) {
      metricsWonA++;
    } else if (valB > mA.value) {
      metricsWonB++;
    }
  });

  const getCoordinates = (angle: number, dist: number) => {
    return {
      x: center + dist * Math.cos(angle),
      y: center + dist * Math.sin(angle),
    };
  };

  const getGridPoints = (scale: number) => {
    return Array.from({ length: numAxes })
      .map((_, i) => {
        const angle = startAngle + i * angleStep;
        const { x, y } = getCoordinates(angle, radius * scale);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Generate polygon points for Player A
  const dataPointsA = metricsA.map((m, i) => {
    const angle = startAngle + i * angleStep;
    const valRatio = Math.max(0.05, Math.min(1.0, m.value / 100));
    return getCoordinates(angle, radius * valRatio);
  });
  const polygonPointsA = dataPointsA.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Generate polygon points for Player B
  const dataPointsB = metricsB.map((m, i) => {
    const angle = startAngle + i * angleStep;
    const valRatio = Math.max(0.05, Math.min(1.0, m.value / 100));
    return getCoordinates(angle, radius * valRatio);
  });
  const polygonPointsB = dataPointsB.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Coordinates for label placements
  const labelDist = radius + 28;
  const labelPositions = metricsA.map((m, i) => {
    const angle = startAngle + i * angleStep;
    const { x, y } = getCoordinates(angle, labelDist);

    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.25) {
      textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }

    const metricB = metricsB[i];
    return { x, y, angle, textAnchor, metricA: m, metricB };
  });

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      {/* 1. Header: Title, Position Switcher & Player Legend Sub-row */}
      <div
        style={{
          paddingBottom: '14px',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '12px',
        }}
      >
        {/* Row 1: Title & Position Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                color: '#0f172a',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              PERFORMANCE
            </h3>
            {radarTitle && (
              <span style={{ color: '#64748b', fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase' }}>
                · {radarTitle}
              </span>
            )}
          </div>

          {/* Position Selector Pills */}
          {commonPositions && commonPositions.length > 1 && onSelectPosition ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Position:
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  padding: '2px',
                  borderRadius: '8px',
                  gap: '2px',
                }}
              >
                {commonPositions.map((pos) => {
                  const isActive = pos === selectedPosition;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onSelectPosition(pos)}
                      style={{
                        border: 'none',
                        background: isActive ? '#0f172a' : 'transparent',
                        color: isActive ? '#ffffff' : '#64748b',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <span
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #e2e8f0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {selectedPosition}
            </span>
          )}
        </div>

        {/* Row 2: Player Legend Sub-row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '8px',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: playerAHexColor,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#1e3a8a' }}>{playerAName}</span>
          </div>

          <span style={{ color: '#cbd5e1' }}>•</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: playerBHexColor,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#78350f' }}>{playerBName}</span>
          </div>
        </div>
      </div>

      {/* 2. Expanded SVG Radar Canvas */}
      <div
        style={{
          width: '100%',
          minHeight: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flex: 1,
          padding: '4px 0',
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full select-none"
          style={{
            width: '100%',
            maxWidth: '410px',
            maxHeight: '410px',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Player A Gradient Fill */}
            <linearGradient id="compRadarFillA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={playerAHexColor} stopOpacity="0.30" />
              <stop offset="100%" stopColor={playerAHexColor} stopOpacity="0.15" />
            </linearGradient>

            {/* Player B Gradient Fill */}
            <linearGradient id="compRadarFillB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={playerBHexColor} stopOpacity="0.30" />
              <stop offset="100%" stopColor={playerBHexColor} stopOpacity="0.15" />
            </linearGradient>

            {/* Hover Glow */}
            <filter id="compRadarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric Polar Grid */}
          {gridLevels.map((level, lvlIdx) => (
            <polygon
              key={lvlIdx}
              points={getGridPoints(level)}
              fill={lvlIdx === gridLevels.length - 1 ? '#f8fafc' : 'transparent'}
              stroke="#94a3b8"
              strokeWidth={lvlIdx === gridLevels.length - 1 ? '1.8' : '1.2'}
              strokeDasharray={lvlIdx === gridLevels.length - 1 ? 'none' : '4 3'}
              opacity={lvlIdx === gridLevels.length - 1 ? 1 : 0.7}
            />
          ))}

          {/* Radial Spokes */}
          {Array.from({ length: numAxes }).map((_, i) => {
            const angle = startAngle + i * angleStep;
            const outer = getCoordinates(angle, radius);
            const isHovered = hoveredIdx === i;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke={isHovered ? '#0f172a' : '#cbd5e1'}
                strokeWidth={isHovered ? '2' : '1'}
                strokeDasharray="3 3"
                opacity={isHovered ? 1 : 0.8}
                style={{ cursor: 'pointer', transition: 'stroke 0.2s ease' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Player A Polygon (Blue) */}
          <polygon
            points={polygonPointsA}
            fill="url(#compRadarFillA)"
            stroke={playerAHexColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: 'all 0.35s ease' }}
          />

          {/* Player B Polygon (Amber) */}
          <polygon
            points={polygonPointsB}
            fill="url(#compRadarFillB)"
            stroke={playerBHexColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: 'all 0.35s ease' }}
          />

          {/* Player A Vertex Dots */}
          {dataPointsA.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={`dotA-${i}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill="#ffffff"
                  stroke={playerAHexColor}
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}

          {/* Player B Vertex Dots */}
          {dataPointsB.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={`dotB-${i}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill="#ffffff"
                  stroke={playerBHexColor}
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.2s ease' }}
                />
              </g>
            );
          })}

          {/* Axis Labels & Values */}
          {labelPositions.map((pos, i) => {
            const isHovered = hoveredIdx === i;
            const mA = pos.metricA;
            const mB = pos.metricB;
            const valA = mA.value;
            const valB = mB?.value ?? 0;
            const isWinnerA = valA > valB;
            const isWinnerB = valB > valA;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Metric Title */}
                <text
                  x={pos.x}
                  y={pos.y - 6}
                  textAnchor={pos.textAnchor}
                  fill={isHovered ? '#0f172a' : '#334155'}
                  fontSize="11"
                  fontWeight="900"
                  letterSpacing="0.04em"
                >
                  {mA.label}
                </text>

                {/* Score Comparison: [Score A] vs [Score B] with Winner Highlight */}
                <text
                  x={pos.x}
                  y={pos.y + 9}
                  textAnchor={pos.textAnchor}
                  fontSize="12.5"
                  fontWeight="900"
                >
                  <tspan
                    fill={playerAHexColor}
                    fontWeight={isWinnerA ? '900' : '700'}
                    opacity={isWinnerB ? 0.75 : 1}
                  >
                    {valA}
                  </tspan>
                  <tspan fill="#94a3b8" fontWeight="600" dx="3" dy="0">
                    /
                  </tspan>
                  <tspan
                    fill={playerBHexColor}
                    fontWeight={isWinnerB ? '900' : '700'}
                    opacity={isWinnerA ? 0.75 : 1}
                    dx="3"
                  >
                    {valB}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 3. Metrics Won Footer (Strictly 2 Lines Per Box) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          width: '100%',
        }}
      >
        {/* Player A Box */}
        <div
          style={{
            background: 'rgba(239, 246, 255, 0.8)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#1e3a8a',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {playerAName}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#1d4ed8',
              marginTop: '3px',
            }}
          >
            {metricsWonA} {metricsWonA === 1 ? 'METRIC WON' : 'METRICS WON'}
          </span>
        </div>

        {/* Player B Box */}
        <div
          style={{
            background: 'rgba(254, 243, 199, 0.8)',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#78350f',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {playerBName}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#b45309',
              marginTop: '3px',
            }}
          >
            {metricsWonB} {metricsWonB === 1 ? 'METRIC WON' : 'METRICS WON'}
          </span>
        </div>
      </div>
    </div>
  );
};
