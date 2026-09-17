import React, { useState, useMemo, useEffect } from 'react';
import type { CompetitionItem } from '../../../types/competition.types';

export interface CompetitionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitions: CompetitionItem[];
  selectedCompetitionIds: string[];
  onApply: (selectedIds: string[]) => void;
}

export const CompetitionPickerModal: React.FC<CompetitionPickerModalProps> = ({
  isOpen,
  onClose,
  competitions,
  selectedCompetitionIds,
  onApply,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tempCompIds, setTempCompIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempCompIds([...selectedCompetitionIds]);
      setSearchTerm('');
    }
  }, [isOpen, selectedCompetitionIds]);

  const searchedCompetitions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return competitions;
    return competitions.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.country && c.country.toLowerCase().includes(term)),
    );
  }, [competitions, searchTerm]);

  const toggleTempComp = (id: string) => {
    setTempCompIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    onApply(tempCompIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="scout-modal-backdrop" onClick={onClose}>
      <div
        className="scout-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Competitions"
      >
        <div className="scout-modal-header">
          <h3 className="scout-modal-title">Select Competitions</h3>
          <button
            type="button"
            className="scout-modal-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="scout-modal-search">
          <input
            type="text"
            className="scout-modal-input"
            placeholder="Search competitions or country…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="scout-modal-list">
          {searchedCompetitions.length === 0 ? (
            <div className="scout-modal-empty">No competitions found</div>
          ) : (
            searchedCompetitions.map((comp) => {
              const isChecked = tempCompIds.includes(comp.id);
              return (
                <label key={comp.id} className="scout-modal-item">
                  <input
                    type="checkbox"
                    className="scout-modal-checkbox"
                    checked={isChecked}
                    onChange={() => toggleTempComp(comp.id)}
                  />
                  {comp.logoUrl && (
                    <img
                      src={comp.logoUrl}
                      alt={comp.name}
                      className="scout-modal-item-img"
                    />
                  )}
                  <div className="scout-modal-item-info">
                    <span className="scout-modal-item-name">{comp.name}</span>
                    {comp.country && (
                      <span className="scout-modal-item-sub">{comp.country}</span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="scout-modal-footer">
          <button
            type="button"
            className="scout-modal-secondary-btn"
            onClick={() => setTempCompIds([])}
          >
            Clear All
          </button>
          <button
            type="button"
            className="scout-modal-primary-btn"
            onClick={handleApply}
          >
            Apply Selection ({tempCompIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
