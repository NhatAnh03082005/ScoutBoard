import React, { useState, useEffect } from 'react';
import type { Shortlist, ShortlistVisibility } from '../types/shortlist.types';
import {
  getShortlistsApi,
  createShortlistApi,
  updateShortlistApi,
  deleteShortlistApi,
} from '../services/shortlist.service';

interface MyShortlistsPageProps {
  onOpenShortlist?: (id: string) => void;
  onNavigateToLogin?: () => void;
  onNavigateToSearch?: () => void;
  isAuthenticated?: boolean;
}

export const MyShortlistsPage: React.FC<MyShortlistsPageProps> = ({
  onOpenShortlist,
  onNavigateToLogin,
  onNavigateToSearch,
  isAuthenticated = true,
}) => {
  // Data State
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingShortlist, setEditingShortlist] = useState<Shortlist | null>(null);
  const [deletingShortlist, setDeletingShortlist] = useState<Shortlist | null>(null);
  const [viewingShortlist, setViewingShortlist] = useState<Shortlist | null>(null);

  // Form States for Create
  const [createName, setCreateName] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createVisibility, setCreateVisibility] = useState<ShortlistVisibility>('PRIVATE');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form States for Edit
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editVisibility, setEditVisibility] = useState<ShortlistVisibility>('PRIVATE');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Action Loading
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false);

  // Success Notification toast/banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchShortlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShortlistsApi();
      setShortlists(data);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        setError('UNAUTHORIZED');
      } else {
        setError(err.message || 'Unable to load shortlists. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchShortlists();
  }, []);

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateVisibility('PRIVATE');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Shortlist name is required');
      return;
    }

    setSubmittingCreate(true);
    setCreateError(null);
    try {
      const created = await createShortlistApi({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        visibility: createVisibility,
      });

      setShortlists((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      showToast(`Shortlist "${created.name}" created successfully!`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create shortlist');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (sl: Shortlist) => {
    setEditingShortlist(sl);
    setEditName(sl.name);
    setEditDescription(sl.description || '');
    setEditVisibility(sl.visibility);
    setEditError(null);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShortlist) return;
    if (!editName.trim()) {
      setEditError('Shortlist name is required');
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);
    try {
      const updated = await updateShortlistApi(editingShortlist.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        visibility: editVisibility,
      });

      setShortlists((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingShortlist(null);
      showToast(`Shortlist "${updated.name}" updated successfully!`);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update shortlist');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingShortlist) return;
    setDeletingLoading(true);
    try {
      await deleteShortlistApi(deletingShortlist.id);
      setShortlists((prev) => prev.filter((item) => item.id !== deletingShortlist.id));
      showToast(`Shortlist "${deletingShortlist.name}" has been deleted.`);
      setDeletingShortlist(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete shortlist');
    } finally {
      setDeletingLoading(false);
    }
  };

  // TC-08: Unauthorized Session view
  if (error === 'UNAUTHORIZED' || !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
            🔒
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            Authentication Required
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Please log in to your ScoutBoard account to create, manage, and view your custom shortlists.
          </p>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-sm transition-all duration-200 text-sm tracking-wide"
          >
            Log In to ScoutBoard
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

      {/* Header Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              My Shortlists
            </h1>
            {!loading && !error && (
              <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-full border border-blue-100">
                {shortlists.length} {shortlists.length === 1 ? 'List' : 'Lists'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Curate, organize, and monitor custom player watchlists for your scouting targets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap"
        >
          <span className="text-lg leading-none">+</span>
          <span>New Shortlist</span>
        </button>
      </div>

      {/* TC-07: Error State */}
      {error && error !== 'UNAUTHORIZED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
          <div className="text-3xl mb-2">⚠️</div>
          <h3 className="text-base font-bold text-rose-900 mb-1">Failed to Load Shortlists</h3>
          <p className="text-sm text-rose-700 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchShortlists()}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* TC-05: Loading State (Skeleton Grid) */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col justify-between h-56"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="h-6 bg-slate-200 rounded-md w-1/2"></div>
                  <div className="h-5 bg-slate-100 rounded-full w-16"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-200 rounded-lg w-14"></div>
                  <div className="h-8 bg-slate-200 rounded-lg w-14"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TC-06: Empty State */}
      {!loading && !error && shortlists.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm my-8">
          <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
            📋
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">
            No Shortlists Created Yet
          </h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Create your first shortlist to start grouping and tracking potential transfer targets, scouting reports, and key player metrics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-all"
            >
              + Create Your First Shortlist
            </button>
            {onNavigateToSearch && (
              <button
                type="button"
                onClick={onNavigateToSearch}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-6 py-3 rounded-xl transition-all"
              >
                Browse Players
              </button>
            )}
          </div>
        </div>
      )}

      {/* TC-01 & TC-03: Shortlists Grid */}
      {!loading && !error && shortlists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shortlists.map((sl) => (
            <div
              key={sl.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3
                    onClick={() => {
                      if (onOpenShortlist) onOpenShortlist(sl.id);
                      else setViewingShortlist(sl);
                    }}
                    className="text-base lg:text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 cursor-pointer transition-colors"
                  >
                    {sl.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${
                      sl.visibility === 'PUBLIC'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{sl.visibility === 'PUBLIC' ? '🌐' : '🔒'}</span>
                    <span>{sl.visibility}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed min-h-[36px]">
                  {sl.description || <span className="italic text-slate-400">No description provided</span>}
                </p>
              </div>

              {/* Card Bottom / Metadata & Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span>📅 Updated {formatDate(sl.updatedAt || sl.createdAt)}</span>
                  {sl.playerCount !== undefined && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                      👥 {sl.playerCount}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenShortlist) onOpenShortlist(sl.id);
                      else setViewingShortlist(sl);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2 px-3 rounded-lg transition-colors text-center"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sl)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg transition-colors text-center"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingShortlist(sl)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2 px-3 rounded-lg transition-colors text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 lg:p-8 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Create New Shortlist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up a new target watchlist for player scouting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shortlist Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  autoFocus
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g., European U23 Winger Targets"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Notes on scouting scope, requirements, or transfer window context..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PRIVATE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createVisibility === 'PRIVATE'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <span>🔒</span>
                      <span>Private</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Visible only to you</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PUBLIC')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createVisibility === 'PUBLIC'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <span>🌐</span>
                      <span>Public</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Shared with scouts</p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submittingCreate}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate || !createName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingCreate ? 'Creating...' : 'Create Shortlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingShortlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 lg:p-8 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Edit Shortlist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update shortlist details and sharing settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShortlist(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl mb-4">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shortlist Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditVisibility('PRIVATE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editVisibility === 'PRIVATE'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <span>🔒</span>
                      <span>Private</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Visible only to you</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditVisibility('PUBLIC')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editVisibility === 'PUBLIC'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <span>🌐</span>
                      <span>Public</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Shared with scouts</p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingShortlist(null)}
                  disabled={submittingEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || !editName.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingShortlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 lg:p-8 border border-slate-100 text-center animate-scaleUp">
            <div className="w-14 h-14 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Delete Shortlist?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{deletingShortlist.name}"</strong>? All saved target associations in this list will be removed.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingShortlist(null)}
                disabled={deletingLoading}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {deletingLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SHORTLIST MODAL */}
      {viewingShortlist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 lg:p-8 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {viewingShortlist.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      viewingShortlist.visibility === 'PUBLIC'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {viewingShortlist.visibility === 'PUBLIC' ? '🌐 PUBLIC' : '🔒 PRIVATE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {viewingShortlist.description || 'No description provided.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingShortlist(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center my-4">
              <div className="text-3xl mb-2">⚽</div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Target Players in Shortlist
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Use the Player Search page or Player Detail cards to add scouts and targets to this list.
              </p>
              {onNavigateToSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingShortlist(null);
                    onNavigateToSearch();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  Search & Add Players
                </button>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setViewingShortlist(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
