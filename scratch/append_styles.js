const fs = require('fs');

const styles = `

/* ── Task 4.3: Interactive Statistic Ranges & Top N Styling ── */
.scout-stat-ranges-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scout-stat-range-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--scout-radius-lg);
  transition: border-color 0.2s, background-color 0.2s;
}

.scout-stat-range-row:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(56, 189, 248, 0.3);
}

.scout-stat-range-row--error {
  border-color: rgba(239, 68, 68, 0.5) !important;
  background: rgba(239, 68, 68, 0.04);
}

.scout-stat-range-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.scout-stat-range-select {
  flex: 1 1 200px;
  min-width: 180px;
  background: #090e17;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--scout-radius-md);
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.scout-stat-range-select:focus {
  border-color: #38bdf8;
}

.scout-stat-range-inputs-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scout-stat-range-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.scout-stat-range-field label {
  font-size: 0.78rem;
  color: var(--scout-text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.scout-stat-range-input {
  width: 85px;
  background: #090e17;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--scout-radius-md);
  padding: 7px 10px;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}

.scout-stat-range-input:focus {
  border-color: #38bdf8;
}

.scout-stat-range-remove-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--scout-radius-md);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.scout-stat-range-remove-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.scout-stat-range-error {
  font-size: 0.76rem;
  color: #f87171;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
}

.scout-stat-range-add-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px dashed rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  padding: 8px 14px;
  border-radius: var(--scout-radius-md);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.scout-stat-range-add-btn:hover {
  background: rgba(56, 189, 248, 0.16);
  border-color: #38bdf8;
  color: #7dd3fc;
}

/* ── Top N Section Styling ── */
.scout-context-card--topn {
  background: linear-gradient(135deg, rgba(14, 25, 48, 0.95) 0%, rgba(20, 42, 85, 0.7) 100%);
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.scout-topn-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scout-topn-controls-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.scout-topn-presets {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.scout-topn-preset-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--scout-text-secondary);
  padding: 6px 12px;
  border-radius: var(--scout-radius-pill);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.scout-topn-preset-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.scout-topn-preset-btn.active {
  background: #0284c7;
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.35);
}

.scout-topn-custom-input {
  width: 70px;
  background: #090e17;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--scout-radius-md);
  padding: 6px 10px;
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.2s;
}

.scout-topn-custom-input:focus {
  border-color: #38bdf8;
}

.scout-topn-metric-select {
  min-width: 200px;
  background: #090e17;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--scout-radius-md);
  padding: 7px 12px;
  font-size: 0.83rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.scout-topn-metric-select:focus {
  border-color: #38bdf8;
}

.scout-topn-active-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: var(--scout-radius-lg);
  font-size: 0.85rem;
  color: #e2e8f0;
}

.scout-topn-active-badge strong {
  color: #38bdf8;
  font-weight: 600;
}

.scout-topn-clear-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--scout-radius-sm);
  transition: color 0.15s, background-color 0.15s;
}

.scout-topn-clear-btn:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
}
`;

fs.appendFileSync('frontend/src/index.css', styles);
console.log('Successfully appended styles to index.css!');
