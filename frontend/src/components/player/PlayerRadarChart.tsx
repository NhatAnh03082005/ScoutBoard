import React, { useState } from 'react';
import type { RadarMetric } from '../../utils/radar.utils';

interface PlayerRadarChartProps {
  metrics: RadarMetric[];
  positionLabel?: string;
  roleHexColor?: string;
}

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  metrics,
  positionLabel = 'Player',
  roleHexColor = '#3b82f6',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calibrated 420x420 coordinate system with radius 116
  // Keeps all 5 labels and values inside canvas bounds with comfortable padding
  const size = 420;
  const center = size / 2; // 210
  const radius = 116;
  const numAxes = metrics.length || 5;
  const angleStep = (Math.PI * 2) / numAxes;
  // Start from top (-PI/2)
  const startAngle = -Math.PI / 2;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to compute (x, y) given angle and distance
  const getCoordinates = (angle: number, dist: number) => {
    return {
      x: center + dist * Math.cos(angle),
      y: center + dist * Math.sin(angle),
    };
  };

  // Generate polygon points string for a given scale factor (0 to 1)
  const getGridPoints = (scale: number) => {
    return Array.from({ length: numAxes })
      .map((_, i) => {
        const angle = startAngle + i * angleStep;
        const { x, y } = getCoordinates(angle, radius * scale);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Generate polygon points string for player data (values 0-100)
  const dataPoints = metrics.map((m, i) => {
    const angle = startAngle + i * angleStep;
    // Minimum 5% to avoid completely invisible polygon when all zero
    const valRatio = Math.max(0.05, Math.min(1.0, m.value / 100));
    return getCoordinates(angle, radius * valRatio);
  });

  const polygonPointsString = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Coordinates for label placements
  const labelDist = radius + 24;
  const labelPositions = metrics.map((m, i) => {
    const angle = startAngle + i * angleStep;
    const { x, y } = getCoordinates(angle, labelDist);

    // Text anchor depending on left/right/center
    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.25) {
      textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }

    return { x, y, angle, textAnchor, metric: m };
  });

  return (
    <div
      className="scout-radar-chart-root"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Centered Radar Canvas */}
      <div
        className="scout-radar-graphic-box"
        style={{
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          margin: 'auto 0',
          padding: '2px',
          minHeight: '280px',
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full select-none"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '370px',
            maxHeight: '370px',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Gradient fill with enhanced opacity for punchy surface */}
            <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={roleHexColor} stopOpacity="0.48" />
              <stop offset="100%" stopColor={roleHexColor} stopOpacity="0.25" />
            </linearGradient>

            {/* Glowing filter for vertex hover */}
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Concentric Polar Grid (Slate-400 #94a3b8 for bold, clear boundaries) */}
          {gridLevels.map((level, lvlIdx) => (
            <polygon
              key={lvlIdx}
              points={getGridPoints(level)}
              fill={lvlIdx === gridLevels.length - 1 ? '#f8fafc' : 'transparent'}
              stroke="#94a3b8"
              strokeWidth={lvlIdx === gridLevels.length - 1 ? '2' : '1.4'}
              strokeDasharray={lvlIdx === gridLevels.length - 1 ? 'none' : '4 3'}
              opacity={lvlIdx === gridLevels.length - 1 ? 1 : 0.85}
            />
          ))}

          {/* 2. Radial Spokes (Interactive on hover, Slate-400 #94a3b8) */}
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
                stroke={isHovered ? roleHexColor : '#94a3b8'}
                strokeWidth={isHovered ? '2.2' : '1.3'}
                strokeDasharray="3 3"
                opacity={isHovered ? 1 : 0.75}
                style={{ cursor: 'pointer', transition: 'stroke 0.2s ease' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* 3. Player Data Filled Polygon (Bold 3.5px Stroke) */}
          <polygon
            points={polygonPointsString}
            fill="url(#radarFillGrad)"
            stroke={roleHexColor}
            strokeWidth="3.5"
            strokeLinejoin="round"
            style={{
              transition: 'all 0.35s ease',
            }}
          />

          {/* 4. Vertex Points (Mechanical "Nhụy Trắng - Viền Màu" Button Dots) */}
          {dataPoints.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 5}
                  fill="#ffffff"
                  stroke={roleHexColor}
                  strokeWidth="3"
                  style={{
                    transition: 'all 0.2s ease',
                    filter: isHovered ? 'url(#radarGlow)' : 'none',
                  }}
                />
              </g>
            );
          })}

          {/* Axis Labels & Scores */}
          {labelPositions.map((pos, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Metric Label Title */}
                <text
                  x={pos.x}
                  y={pos.y - 4}
                  textAnchor={pos.textAnchor}
                  fill={isHovered ? '#0f172a' : '#334155'}
                  fontSize="11.5"
                  fontWeight="900"
                  letterSpacing="0.05em"
                  className="transition-colors duration-150"
                >
                  {pos.metric.label}
                </text>

                {/* Metric Value / Raw Score Sub-text */}
                <text
                  x={pos.x}
                  y={pos.y + 11}
                  textAnchor={pos.textAnchor}
                  fill={isHovered ? roleHexColor : '#0f172a'}
                  fontSize="13.5"
                  fontWeight="900"
                  className="transition-colors duration-150"
                >
                  {pos.metric.value}
                  <tspan fontSize="10" fontWeight="700" fill="#64748b" dx="3">
                    ({pos.metric.rawValue})
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2. Bottom Dynamic Footer: Replaces Tactical Shape on hover to save space */}
      <div
        className="scout-radar-caption-footer"
        style={{
          marginTop: 'auto',
          paddingTop: '6px',
          paddingBottom: '2px',
          fontSize: '13px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          textAlign: 'center',
          minHeight: '24px',
        }}
      >
        {hoveredIdx !== null && metrics[hoveredIdx] ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: roleHexColor, fontWeight: 900 }}>
              {metrics[hoveredIdx].label}:
            </span>
            <span style={{ color: '#0f172a', fontWeight: 900 }}>
              {metrics[hoveredIdx].rawValue}
            </span>
            <span style={{ color: '#64748b', fontSize: '11.5px', fontWeight: 700 }}>
              (Index: {metrics[hoveredIdx].value}/100)
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>Tactical Shape:</span>
            <strong
              style={{
                fontWeight: 900,
                fontSize: '15px',
                color: roleHexColor,
                letterSpacing: '0.04em',
              }}
            >
              {positionLabel}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};
