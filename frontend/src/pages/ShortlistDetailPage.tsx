import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistPlayerItem } from '../types/shortlist.types';
import {
  getShortlistByIdApi,
  getShortlistPlayersApi,
  removePlayerFromShortlistApi,
  updateShortlistPlayerNoteApi,
} from '../services/shortlist.service';

interface ShortlistDetailPageProps {
  shortlistId: string;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
  onNavigateToSearch?: () => void;
  onNavigateToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const ShortlistDetailPage: React.FC<ShortlistDetailPageProps> = ({
  shortlistId,
  onBack,
  onSelectPlayer,
  onNavigateToSearch,
  onNavigateToLogin,
  isAuthenticated = true,
}) => {
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [players, setPlayers] = useState<ShortlistPlayerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Note Edit Modal State
  const [editingPlayerNote, setEditingPlayerNote] = useState<ShortlistPlayerItem | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Remove Player Confirmation State
  const [removingPlayer, setRemovingPlayer] = useState<ShortlistPlayerItem | null>(null);
  const [removingLoading, setRemovingLoading] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchShortlistDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shortlistData, playersData] = await Promise.all([
        getShortlistByIdApi(shortlistId),
        getShortlistPlayersApi(shortlistId),
      ]);
      setShortlist(shortlistData);
      setPlayers(playersData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Shortlist not found or you do not have permission to view it.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchShortlistDetails();
  }, [shortlistId]);

  // Calculate age helper
  const calculateAge = (dateOfBirth?: string | null): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Open Edit Note
  const handleOpenNoteModal = (item: ShortlistPlayerItem) => {
    setEditingPlayerNote(item);
    setNoteInput(item.note || '');
    setNoteError(null);
  };

  // Save Note
  const handleSaveNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayerNote) return;

    setSavingNote(true);
    setNoteError(null);
    try {
      const updated = await updateShortlistPlayerNoteApi(
        shortlistId,
        editingPlayerNote.playerId,
        noteInput.trim() || null,
      );

      setPlayers((prev) =>
        prev.map((p) =>
          p.playerId === editingPlayerNote.playerId
            ? { ...p, note: updated.note }
            : p,
        ),
      );
      setEditingPlayerNote(null);
      showToast('Scout note updated successfully!');
    } catch (err: any) {
      setNoteError(err.message || 'Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  // Confirm Remove Player
  const handleConfirmRemove = async () => {
    if (!removingPlayer) return;

    setRemovingLoading(true);
    try {
      await removePlayerFromShortlistApi(shortlistId, removingPlayer.playerId);
      setPlayers((prev) => prev.filter((p) => p.playerId !== removingPlayer.playerId));
      showToast(
        `Removed ${removingPlayer.player?.name || 'Player'} from this shortlist.`,
      );
      setRemovingPlayer(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove player');
    } finally {
      setRemovingLoading(false);
    }
  };

  // TC-05 / TC-08: Unauthorized or Access Denied
  if (error === 'UNAUTHORIZED' || !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
            🔒
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            Authentication Required
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Please log in to view and manage this shortlist.
          </p>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium border border-slate-800 animate-slideUp">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:border-slate-300 transition-all mb-6 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span>
        <span>Back to Shortlists</span>
      </button>

      {/* TC-05: Error / Not Found / Access Denied State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
          <div className="text-4xl mb-3">⛔</div>
          <h3 className="text-lg font-black text-rose-900 mb-2">
            Shortlist Unavailable
          </h3>
          <p className="text-sm text-rose-700 mb-6 leading-relaxed">
            {error}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Return to My Shortlists
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse h-64"
              >
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-14 h-14 bg-slate-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-20 bg-slate-50 rounded-xl mb-4"></div>
                <div className="h-8 bg-slate-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shortlist Details Header */}
      {!loading && !error && shortlist && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    {shortlist.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      shortlist.visibility === 'PUBLIC'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{shortlist.visibility === 'PUBLIC' ? '🌐' : '🔒'}</span>
                    <span>{shortlist.visibility}</span>
                  </span>
                  <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-full border border-blue-100">
                    {players.length} {players.length === 1 ? 'Target' : 'Targets'}
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
                  {shortlist.description || (
                    <span className="italic text-slate-400">No description provided.</span>
                  )}
                </p>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                  <span>📅 Updated {formatDate(shortlist.updatedAt || shortlist.createdAt)}</span>
                </div>
              </div>

              {onNavigateToSearch && (
                <button
                  type="button"
                  onClick={onNavigateToSearch}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-sm transition-all whitespace-nowrap active:scale-95"
                >
                  <span>+ Add More Players</span>
                </button>
              )}
            </div>
          </div>

          {/* TC-02: Empty Shortlist State */}
          {players.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm my-8">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
                ⚽
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">
                No Players in this Shortlist
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Start adding target players to monitor their performance, statistics, and scouting notes.
              </p>
              {onNavigateToSearch && (
                <button
                  type="button"
                  onClick={onNavigateToSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all"
                >
                  Browse & Add Players
                </button>
              )}
            </div>
          )}

          {/* TC-01 & TC-06: Players Grid */}
          {players.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((item) => {
                const player = item.player;
                const age = calculateAge(player?.dateOfBirth);

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Player Profile Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-black text-xl shadow-inner relative">
                          {player?.imageUrl ? (
                            <img
                              src={player.imageUrl}
                              alt={player.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{player?.shirtNumber || '⚽'}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              onClick={() => onSelectPlayer(item.playerId)}
                              className="text-base font-black text-slate-900 truncate hover:text-blue-600 cursor-pointer transition-colors"
                              title={player?.name}
                            >
                              {player?.name || 'Unknown Player'}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                            {player?.primaryPosition && (
                              <span className="bg-slate-900 text-white font-black text-[10px] px-2 py-0.5 rounded-md">
                                {player.primaryPosition}
                              </span>
                            )}
                            {player?.currentTeam && (
                              <span className="truncate text-slate-700 font-semibold">
                                {player.currentTeam.name}
                              </span>
                            )}
                            {age && <span>• {age} yrs</span>}
                            {player?.nationality && <span>• {player.nationality}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Scout Note Box */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-4 group/note hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            📝 Scout Note
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(item)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {item.note ? 'Edit Note' : '+ Add Note'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed italic">
                          {item.note || (
                            <span className="text-slate-400 font-normal not-italic">
                              No scouting notes added for this player yet.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectPlayer(item.playerId)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors text-center"
                      >
                        View Profile ↗
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovingPlayer(item)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-colors"
                        title="Remove from shortlist"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TC-04: EDIT SCOUT NOTE MODAL */}
      {editingPlayerNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 lg:p-8 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Scout Note for {editingPlayerNote.player?.name || 'Player'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private observations, tactical strengths, and scouting remarks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlayerNote(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {noteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                ⚠️ {noteError}
              </div>
            )}

            <form onSubmit={handleSaveNoteSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  autoFocus
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. Strong 1v1 defender, high press resistance, contract expires in 2027..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl p-4 text-sm text-slate-900 font-medium transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoteInput('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear Note
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlayerNote(null)}
                    disabled={savingNote}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TC-03: REMOVE PLAYER CONFIRMATION MODAL */}
      {removingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 lg:p-8 border border-slate-100 text-center animate-scaleUp">
            <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
              ✕
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Remove Player from Shortlist?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Remove <strong className="text-slate-900">"{removingPlayer.player?.name || 'this player'}"</strong> from this shortlist? The player record itself will not be deleted.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setRemovingPlayer(null)}
                disabled={removingLoading}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removingLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {removingLoading ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
