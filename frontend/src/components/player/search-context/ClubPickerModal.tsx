import React, { useState, useMemo, useEffect } from 'react';
import type { CompetitionTeamItem } from '../../../types/competition.types';

export interface ClubPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubsToDisplay: CompetitionTeamItem[];
  selectedClubIds: string[];
  selectedCompetitionCount: number;
  onApply: (selectedIds: string[]) => void;
}

export const ClubPickerModal: React.FC<ClubPickerModalProps> = ({
  isOpen,
  onClose,
  clubsToDisplay,
  selectedClubIds,
  selectedCompetitionCount,
  onApply,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tempClubIds, setTempClubIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTempClubIds([...selectedClubIds]);
      setSearchTerm('');
    }
  }, [isOpen, selectedClubIds]);

  const searchedClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clubsToDisplay;
    return clubsToDisplay.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.shortName && c.shortName.toLowerCase().includes(term)),
    );
  }, [clubsToDisplay, searchTerm]);

  const toggleTempClub = (id: string) => {
    setTempClubIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    onApply(tempClubIds);
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
        aria-label="Select Clubs"
      >
        <div className="scout-modal-header">
          <div>
            <h3 className="scout-modal-title">Select Clubs / Teams</h3>
            {selectedCompetitionCount > 0 && (
              <p className="scout-modal-subtitle">
                Showing clubs from {selectedCompetitionCount} selected competition(s)
              </p>
            )}
          </div>
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
            placeholder="Search club name or abbreviation…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="scout-modal-list">
          {searchedClubs.length === 0 ? (
            <div className="scout-modal-empty">No clubs found</div>
          ) : (
            searchedClubs.map((club) => {
              const id = (club as any).id || (club as any).teamId;
              const isChecked = tempClubIds.includes(id);
              return (
                <label key={id} className="scout-modal-item">
                  <input
                    type="checkbox"
                    className="scout-modal-checkbox"
                    checked={isChecked}
                    onChange={() => toggleTempClub(id)}
                  />
                  {club.logoUrl && (
                    <img
                      src={club.logoUrl}
                      alt={club.name}
                      className="scout-modal-item-img"
                    />
                  )}
                  <div className="scout-modal-item-info">
                    <span className="scout-modal-item-name">{club.name}</span>
                    {club.shortName && (
                      <span className="scout-modal-item-sub">
                        {club.shortName} • {club.country || ''}
                      </span>
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
            onClick={() => setTempClubIds([])}
          >
            Clear All
          </button>
          <button
            type="button"
            className="scout-modal-primary-btn"
            onClick={handleApply}
          >
            Apply Selection ({tempClubIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
