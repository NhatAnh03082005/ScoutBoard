import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistVisibility } from '../../types/shortlist.types';
import {
  getShortlistsApi,
  createShortlistApi,
  addPlayerToShortlistApi,
} from '../../services/shortlist.service';

export interface AddToShortlistPlayerInfo {
  id: string;
  name?: string;
  fullName?: string;
  imageUrl?: string | null;
  primaryPosition?: string | null;
  currentTeam?: {
    name?: string;
    shortName?: string | null;
  } | null;
}

interface AddToShortlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: AddToShortlistPlayerInfo | null;
  onSuccess?: (shortlistName: string) => void;
  onNavigateToLogin?: () => void;
}

export const AddToShortlistModal: React.FC<AddToShortlistModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
  onNavigateToLogin,
}) => {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Note State
  const [selectedShortlistId, setSelectedShortlistId] = useState<string>('');
  const [scoutNote, setScoutNote] = useState<string>('');

  // Inline Create New Shortlist State
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newVisibility, setNewVisibility] = useState<ShortlistVisibility>('PRIVATE');

  // Submitting
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchUserShortlists();
      setScoutNote('');
      setIsCreatingNew(false);
      setNewName('');
      setNewDescription('');
      setNewVisibility('PRIVATE');
      setActionError(null);
    }
  }, [isOpen]);

  const fetchUserShortlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShortlistsApi();
      setShortlists(data);
      if (data.length > 0) {
        setSelectedShortlistId(data[0].id);
      } else {
        setIsCreatingNew(true);
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Failed to load your shortlists');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !player) return null;

  const playerName = player.fullName || player.name || 'Player';
  const teamName = player.currentTeam?.shortName || player.currentTeam?.name || 'Club';

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      let targetShortlistId = selectedShortlistId;
      let targetShortlistName = '';

      if (isCreatingNew) {
        if (!newName.trim()) {
          setActionError('Please enter a name for the new shortlist');
          setSubmitting(false);
          return;
        }

        const created = await createShortlistApi({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          visibility: newVisibility,
        });

        targetShortlistId = created.id;
        targetShortlistName = created.name;
      } else {
        const selected = shortlists.find((s) => s.id === targetShortlistId);
        targetShortlistName = selected ? selected.name : 'Shortlist';
      }

      if (!targetShortlistId) {
        setActionError('Please select or create a shortlist');
        setSubmitting(false);
        return;
      }

      await addPlayerToShortlistApi(
        targetShortlistId,
        player.id,
        scoutNote.trim() || undefined,
      );

      if (onSuccess) {
        onSuccess(targetShortlistName);
      }
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to add player to shortlist';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        setActionError(`⚠️ ${playerName} is already in this shortlist.`);
      } else {
        setActionError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 lg:p-8 border border-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Add to Shortlist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Save player to your scouting watchlists
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        {/* Player Mini Badge */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-500 font-bold text-sm shadow-inner">
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={playerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>⚽</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 truncate">
              {playerName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
              {player.primaryPosition && (
                <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                  {player.primaryPosition}
                </span>
              )}
              <span className="truncate text-slate-700">{teamName}</span>
            </div>
          </div>
        </div>

        {/* Auth Required State */}
        {error === 'UNAUTHORIZED' ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-600 mb-4">
              Please log in to add players to your shortlists.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateToLogin) onNavigateToLogin();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all"
            >
              Log In Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl">
                {actionError}
              </div>
            )}

            {/* Choose Existing vs Create New Toggle */}
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Shortlist
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isCreatingNew ? '← Choose Existing List' : '+ Create New List'}
              </button>
            </div>

            {/* Mode 1: Choose Existing */}
            {!isCreatingNew && (
              <div>
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                    <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                  </div>
                ) : shortlists.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
                    No shortlists found. Click '+ Create New List' above to start.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {shortlists.map((sl) => (
                      <label
                        key={sl.id}
                        onClick={() => setSelectedShortlistId(sl.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedShortlistId === sl.id
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="radio"
                            name="shortlist"
                            checked={selectedShortlistId === sl.id}
                            onChange={() => setSelectedShortlistId(sl.id)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {sl.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ml-2">
                          {sl.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Create New Inline Subform */}
            {isCreatingNew && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Shortlist Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Champions League Targets"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short description..."
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewVisibility('PRIVATE')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        newVisibility === 'PRIVATE'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      🔒 Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewVisibility('PUBLIC')}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        newVisibility === 'PUBLIC'
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      🌐 Public
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Scout Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Scout Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={scoutNote}
                onChange={(e) => setScoutNote(e.target.value)}
                placeholder="Remarks on tactical fit, key strengths, or observation details..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isCreatingNew && !newName.trim()) || (!isCreatingNew && !selectedShortlistId)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add to Shortlist'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
