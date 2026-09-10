import { SearchInput } from "../common";
import React, { useState, useMemo } from 'react';
import type { FormationCode } from '../../types/squad.types';
import {
  FORMATION_DEFINITIONS,
  ALL_FORMATIONS_LIST,
} from '../../utils/squad-placement.utils';
import type { FormationDefinition } from '../../utils/squad-placement.utils';
import { TacticalMiniPitch } from '../squad/TacticalMiniPitch';

export interface FormationSelectorProps {
  options?: (FormationCode | string)[];
  value: FormationCode | string;
  onChange: (formation: FormationCode) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

type FormationCategoryFilter = 'ALL' | '3 ATB' | '4 ATB' | '5 ATB';

export const FormationSelector: React.FC<FormationSelectorProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  label = 'TACTICAL FORMATION',
  required = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FormationCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Source list of formations
  const baseFormations: FormationDefinition[] = useMemo(() => {
    if (options && options.length > 0) {
      return options
        .map((opt) => FORMATION_DEFINITIONS[opt])
        .filter((f): f is FormationDefinition => Boolean(f));
    }
    return ALL_FORMATIONS_LIST;
  }, [options]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: baseFormations.length, '3 ATB': 0, '4 ATB': 0, '5 ATB': 0 };
    baseFormations.forEach((f) => {
      if (f.category in counts) {
        counts[f.category as '3 ATB' | '4 ATB' | '5 ATB']++;
      }
    });
    return counts;
  }, [baseFormations]);

  // Filtered formations
  const filteredFormations = useMemo(() => {
    return baseFormations.filter((f) => {
      if (selectedCategory !== 'ALL' && f.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesDesc = f.description.toLowerCase().includes(query);
        const matchesCat = f.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [baseFormations, selectedCategory, searchQuery]);

  // Selected formation info
  const selectedDef = FORMATION_DEFINITIONS[value] || FORMATION_DEFINITIONS['4-3-3'] || baseFormations[0];

  // Helper to get composition summary counts
  const compSummary = useMemo(() => {
    if (!selectedDef || !selectedDef.composition) {
      return { gk: 1, def: 4, mid: 3, att: 3 };
    }
    const c = selectedDef.composition;
    const gk = c['GK'] || 1;
    const def = (c['CB'] || 0) + (c['LB'] || 0) + (c['RB'] || 0) + (c['LWB'] || 0) + (c['RWB'] || 0);
    const mid = (c['CDM'] || 0) + (c['CM'] || 0) + (c['CAM'] || 0) + (c['LM'] || 0) + (c['RM'] || 0);
    const att = (c['ST'] || 0) + (c['CF'] || 0) + (c['LW'] || 0) + (c['RW'] || 0);
    return { gk, def, mid, att };
  }, [selectedDef]);

  return (
    <div className="scout-field-group" style={{ marginBottom: '18px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label className="scout-field-label" style={{ margin: 0 }}>
          {label} {required && <span className="scout-field-required">*</span>}
        </label>
        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
          {baseFormations.length} Tactical Presets
        </span>
      </div>

      {/* Selected Formation Highlight Banner */}
      {selectedDef && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Thumbnail mini pitch */}
            <div style={{ width: '46px', height: '62px', flexShrink: 0 }}>
              <TacticalMiniPitch formationCode={selectedDef.id} perspective={false} dotSize={5} />
            </div>

            {/* Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                  {selectedDef.name}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background:
                      selectedDef.category === '3 ATB'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : selectedDef.category === '5 ATB'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(59, 130, 246, 0.2)',
                    color:
                      selectedDef.category === '3 ATB'
                        ? '#34d399'
                        : selectedDef.category === '5 ATB'
                        ? '#fbbf24'
                        : '#60a5fa',
                    border: `1px solid ${
                      selectedDef.category === '3 ATB'
                        ? 'rgba(16, 185, 129, 0.4)'
                        : selectedDef.category === '5 ATB'
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'rgba(59, 130, 246, 0.4)'
                    }`,
                  }}
                >
                  {selectedDef.category}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.3 }}>
                {selectedDef.description}
              </p>
            </div>
          </div>

          {/* Tactical Composition Badges */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}>
                {compSummary.gk} GK
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', background: 'rgba(59,130,246,0.25)', color: '#93c5fd' }}>
                {compSummary.def} DEF
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', background: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                {compSummary.mid} MID
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                {compSummary.att} ATT
              </span>
            </div>
            <span style={{ fontSize: '9.5px', color: '#64748b' }}>Active Tactical Setup</span>
          </div>
        </div>
      )}

      {/* Category Tabs & Search Bar Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', '3 ATB', '4 ATB', '5 ATB'] as FormationCategoryFilter[]).map((cat) => {
            const isTabActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: isTabActive ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  background: isTabActive ? '#eff6ff' : '#f8fafc',
                  color: isTabActive ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{cat}</span>
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '1px 5px',
                    borderRadius: '9999px',
                    background: isTabActive ? '#2563eb' : '#e2e8f0',
                    color: isTabActive ? '#ffffff' : '#64748b',
                  }}
                >
                  {categoryCounts[cat]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <SearchInput
          size="compact"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search formation by name or role (e.g. 4-3-3, Holding, Attack)..."
        />
      </div>

      {/* Formations Grid with Scrollbar */}
      <div
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          paddingRight: '4px',
          paddingBottom: '4px',
        }}
      >
        {filteredFormations.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              No formations matching &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
              gap: '10px',
            }}
            role="group"
            aria-label={label}
          >
            {filteredFormations.map((fmt) => {
              const isSelected = value === fmt.id || value === fmt.name;

              return (
                <button
                  key={fmt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(fmt.id as FormationCode)}
                  title={`${fmt.name}: ${fmt.description}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 6px 6px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    boxShadow: isSelected
                      ? '0 4px 12px rgba(37, 99, 235, 0.18)'
                      : '0 1px 3px rgba(0, 0, 0, 0.04)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !disabled) {
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !disabled) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {/* Perspective 3D Mini Pitch */}
                  <div
                    style={{
                      width: '100%',
                      height: '74px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <TacticalMiniPitch formationCode={fmt.id} perspective={true} dotSize={5.5} />
                  </div>

                  {/* Formation Name */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: isSelected ? '#1d4ed8' : '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    {fmt.name}
                  </div>

                  {/* Category Pill / Selected Checkmark */}
                  <div
                    style={{
                      marginTop: '3px',
                      fontSize: '9px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: isSelected ? '#2563eb' : '#94a3b8',
                    }}
                  >
                    {isSelected ? (
                      <span style={{ color: '#2563eb', fontWeight: 900 }}>✓ SELECTED</span>
                    ) : (
                      <span>{fmt.category}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
