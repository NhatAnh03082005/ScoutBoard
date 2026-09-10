import { useState, useEffect, useCallback, useRef } from 'react';
import {
  triggerAdminSyncApi,
  listSyncJobsApi,
  getSyncJobByIdApi,
} from '../services/data-sync.service';
import {
  getCompetitionsApi,
  getSeasonsByCompetitionApi,
  getMatchesByCompetitionAndSeasonApi,
} from '../services/competition.service';
import type { CompetitionItem } from '../types/competition.types';
import type {
  SyncScope,
  SyncTarget,
  SyncMode,
  SyncJobStatus,
  SyncJobDetail,
  SeasonItem,
  MatchItem,
} from '../types/data-sync.types';

interface AdminDataSyncPageProps {
  accessToken: string;
}

export function AdminDataSyncPage({ accessToken }: AdminDataSyncPageProps) {
  // --- Form & Selection State ---
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);

  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [scope, setScope] = useState<SyncScope>('SEASON');
  const [target, setTarget] = useState<SyncTarget>('FULL');
  const [mode, setMode] = useState<SyncMode>('REFRESH');
  const [date, setDate] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // --- UI & Interaction State ---
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // --- Feedback Alerts ---
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // --- Job History & Pagination State ---
  const [jobs, setJobs] = useState<SyncJobDetail[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [pageLimit, setPageLimit] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<SyncJobStatus | ''>('');
  const [competitionFilter, setCompetitionFilter] = useState<string>('');

  // --- Job Detail Modal State ---
  const [selectedJob, setSelectedJob] = useState<SyncJobDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Auto-polling ref
  const pollingTimerRef = useRef<number | null>(null);

  // 1. Initial Load: Competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      setLoadingCompetitions(true);
      try {
        const compList = await getCompetitionsApi();
        setCompetitions(compList);
        if (compList.length > 0) {
          setSelectedCompetitionId(compList[0].id);
        }
      } catch (err: any) {
        setFeedbackError(err.message || 'Failed to load competitions.');
      } finally {
        setLoadingCompetitions(false);
      }
    };

    void fetchCompetitions();
  }, []);

  // 2. Dependent Load: Seasons when Competition changes
  useEffect(() => {
    if (!selectedCompetitionId) {
      setSeasons([]);
      setSelectedSeasonId('');
      return;
    }

    const fetchSeasons = async () => {
      setLoadingSeasons(true);
      try {
        const seasonList = await getSeasonsByCompetitionApi(selectedCompetitionId);
        setSeasons(seasonList);
        if (seasonList.length > 0) {
          // Prefer current season if exists, else first
          const current = seasonList.find((s) => s.isCurrent);
          setSelectedSeasonId(current ? current.id : seasonList[0].id);
        } else {
          setSelectedSeasonId('');
        }
      } catch (err: any) {
        setFeedbackError(err.message || 'Failed to load seasons for selected competition.');
      } finally {
        setLoadingSeasons(false);
      }
    };

    void fetchSeasons();
  }, [selectedCompetitionId]);

  // 3. Dependent Load: Matches when MATCH scope and season selected
  useEffect(() => {
    if (scope !== 'MATCH' || !selectedCompetitionId || !selectedSeasonId) {
      setMatches([]);
      setSelectedMatchId('');
      return;
    }

    const fetchMatches = async () => {
      setLoadingMatches(true);
      try {
        const matchList = await getMatchesByCompetitionAndSeasonApi(
          selectedCompetitionId,
          selectedSeasonId,
        );
        setMatches(matchList);
        if (matchList.length > 0) {
          setSelectedMatchId(matchList[0].id);
        } else {
          setSelectedMatchId('');
        }
      } catch (err: any) {
        setFeedbackError(err.message || 'Failed to load matches for selected season.');
      } finally {
        setLoadingMatches(false);
      }
    };

    void fetchMatches();
  }, [scope, selectedCompetitionId, selectedSeasonId]);

  // 4. Fetch Sync Jobs List
  const fetchJobs = useCallback(async () => {
    if (!accessToken) return;
    setLoadingJobs(true);
    try {
      const response = await listSyncJobsApi(accessToken, {
        limit: pageLimit,
        offset: pageOffset,
        status: statusFilter || undefined,
        competitionId: competitionFilter || undefined,
      });
      setJobs(response.items);
      setTotalJobs(response.pagination.total);
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to load synchronization jobs.');
    } finally {
      setLoadingJobs(false);
    }
  }, [accessToken, pageLimit, pageOffset, statusFilter, competitionFilter]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  // 5. Polling for Running/Pending selected job or active jobs in list
  useEffect(() => {
    const hasRunningJobs =
      jobs.some((j) => j.status === 'RUNNING' || j.status === 'PENDING') ||
      (selectedJob && (selectedJob.status === 'RUNNING' || selectedJob.status === 'PENDING'));

    if (hasRunningJobs) {
      pollingTimerRef.current = window.setInterval(() => {
        void fetchJobs();
        if (selectedJob && (selectedJob.status === 'RUNNING' || selectedJob.status === 'PENDING')) {
          void getSyncJobByIdApi(accessToken, selectedJob.id).then((updated) => {
            setSelectedJob(updated);
          });
        }
      }, 4000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [jobs, selectedJob, accessToken, fetchJobs]);

  // --- Handlers ---
  const handleTriggerClick = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!selectedCompetitionId) {
      setFormError('Please select a competition.');
      return;
    }
    if (!selectedSeasonId) {
      setFormError('Please select a season.');
      return;
    }
    if (scope === 'DATE' && !date) {
      setFormError('Please specify a date (YYYY-MM-DD) for DATE scope.');
      return;
    }
    if (scope === 'MATCH' && !selectedMatchId) {
      setFormError('Please select a match fixture for MATCH scope.');
      return;
    }

    // Show warning confirmation for full season backfill
    if (scope === 'SEASON' && target === 'FULL') {
      setShowConfirmModal(true);
    } else {
      void executeTrigger();
    }
  };

  const executeTrigger = async () => {
    setShowConfirmModal(false);
    setTriggering(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const res = await triggerAdminSyncApi(accessToken, {
        competitionId: selectedCompetitionId,
        seasonId: selectedSeasonId,
        scope,
        target,
        mode,
        date: scope === 'DATE' ? date : undefined,
        matchId: scope === 'MATCH' ? selectedMatchId : undefined,
      });

      setFeedbackSuccess(
        `Sync job executed (${res.status})! Processed: ${res.processedCount}, Created: ${res.createdCount}, Failed: ${res.failedCount}.`,
      );

      // Refresh jobs list and open detail
      await fetchJobs();
      void handleViewJobDetail(res.jobId);
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to trigger synchronization job.');
    } finally {
      setTriggering(false);
    }
  };

  const handleViewJobDetail = async (jobId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await getSyncJobByIdApi(accessToken, jobId);
      setSelectedJob(detail);
      setExpandedLogId(null);
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to fetch job details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Helper for status badge styling
  const renderStatusBadge = (status: SyncJobStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span
            className="scout-badge"
            style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
          >
            ✓ SUCCESS
          </span>
        );
      case 'PARTIAL_SUCCESS':
        return (
          <span
            className="scout-badge"
            style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
          >
            ⚠ PARTIAL SUCCESS
          </span>
        );
      case 'FAILED':
        return (
          <span
            className="scout-badge"
            style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
          >
            ✕ FAILED
          </span>
        );
      case 'RUNNING':
        return (
          <span
            className="scout-badge"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
          >
            <span className="spinner-inline" style={{ marginRight: '4px' }}>🔄</span> RUNNING
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span
            className="scout-badge"
            style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
          >
            ⏱ PENDING
          </span>
        );
    }
  };

  const selectedCompObj = competitions.find((c) => c.id === selectedCompetitionId);
  const selectedSeasonObj = seasons.find((s) => s.id === selectedSeasonId);

  return (
    <div className="scout-admin-container" style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 16px' }}>
      {/* Top Banner & Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Data Synchronization Center
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Trigger on-demand fixture synchronization, player match statistics ingestion, and season aggregation pipelines.
        </p>
      </div>

      {/* Global Alerts */}
      {feedbackError && (
        <div className="alert-banner alert-error" style={{ marginBottom: '16px' }}>
          ⚠️ {feedbackError}
        </div>
      )}
      {feedbackSuccess && (
        <div className="alert-banner alert-success" style={{ marginBottom: '16px' }}>
          ✅ {feedbackSuccess}
        </div>
      )}

      {/* SECTION 1: SYNC CONTROL PANEL */}
      <div
        className="scout-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Configure & Execute Sync Job
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
            Zone 4 Ingestion Pipeline
          </span>
        </div>

        {formError && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fecaca' }}>
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleTriggerClick}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            {/* Competition Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Competition *
              </label>
              <select
                className="scout-select"
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                disabled={loadingCompetitions || triggering}
                style={{ width: '100%' }}
              >
                {loadingCompetitions ? (
                  <option>Loading competitions...</option>
                ) : competitions.length === 0 ? (
                  <option value="">No competitions found</option>
                ) : (
                  competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.country ? `(${c.country})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Season Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Season *
              </label>
              <select
                className="scout-select"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                disabled={loadingSeasons || triggering || seasons.length === 0}
                style={{ width: '100%' }}
              >
                {loadingSeasons ? (
                  <option>Loading seasons...</option>
                ) : seasons.length === 0 ? (
                  <option value="">No seasons available</option>
                ) : (
                  seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.seasonCode || s.name} {s.isCurrent ? '⭐ (Current)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Scope Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Sync Scope
              </label>
              <select
                className="scout-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as SyncScope)}
                disabled={triggering}
                style={{ width: '100%' }}
              >
                <option value="SEASON">Full Season (All Fixtures)</option>
                <option value="DATE">Specific Matchday Date</option>
                <option value="MATCH">Specific Single Match</option>
              </select>
            </div>

            {/* Target Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Sync Target
              </label>
              <select
                className="scout-select"
                value={target}
                onChange={(e) => setTarget(e.target.value as SyncTarget)}
                disabled={triggering}
                style={{ width: '100%' }}
              >
                <option value="FULL">FULL (Matches + Stats + Season Stats)</option>
                <option value="MATCHES">MATCHES Only (Fixtures & Results)</option>
                <option value="PLAYER_MATCH_STATISTICS">PLAYER MATCH STATS (Lineups & Metrics)</option>
                <option value="SEASON_STATISTICS">SEASON STATISTICS (Recalculate Aggregation)</option>
              </select>
            </div>

            {/* Mode Select */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Sync Mode
              </label>
              <select
                className="scout-select"
                value={mode}
                onChange={(e) => setMode(e.target.value as SyncMode)}
                disabled={triggering}
                style={{ width: '100%' }}
              >
                <option value="REFRESH">REFRESH (Upsert & Overwrite)</option>
                <option value="MISSING">MISSING (Only Missing Records)</option>
              </select>
            </div>
          </div>

          {/* Conditional Controls for Scope */}
          {scope === 'DATE' && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Matchday Date (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                className="scout-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={triggering}
                style={{ maxWidth: '300px' }}
                required
              />
            </div>
          )}

          {scope === 'MATCH' && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Select Match Fixture *
              </label>
              {loadingMatches ? (
                <div style={{ fontSize: '13px', color: '#64748b' }}>Loading season matches...</div>
              ) : matches.length > 0 ? (
                <select
                  className="scout-select"
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  disabled={triggering}
                  style={{ maxWidth: '480px', width: '100%' }}
                  required
                >
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {new Date(m.matchDate).toLocaleDateString()} — {m.homeTeamName || 'Home'} vs {m.awayTeamName || 'Away'} [{m.status}]
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="scout-input"
                    placeholder="Enter Match / Fixture External ID (e.g. 18535518)"
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    disabled={triggering}
                    style={{ maxWidth: '400px' }}
                    required
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Custom fixture ID</span>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
            <button
              type="submit"
              className="scout-btn scout-btn-primary"
              disabled={triggering || loadingCompetitions || loadingSeasons || !selectedCompetitionId || !selectedSeasonId}
              style={{ padding: '10px 24px', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {triggering ? (
                <>
                  <span className="spinner-inline">🔄</span> Executing Pipeline...
                </>
              ) : (
                <>
                  <span>🚀</span> Start Synchronization
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: JOB HISTORY & AUDIT LOGS */}
      <div
        className="scout-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Table Header & Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Execution History & Audit Trail ({totalJobs})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Audit records from data_sync_jobs and data_sync_logs tables
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Status Filter */}
            <select
              className="scout-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SyncJobStatus | '');
                setPageOffset(0);
              }}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PARTIAL_SUCCESS">PARTIAL_SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="PENDING">PENDING</option>
            </select>

            {/* Competition Filter */}
            <select
              className="scout-select"
              value={competitionFilter}
              onChange={(e) => {
                setCompetitionFilter(e.target.value);
                setPageOffset(0);
              }}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              <option value="">All Competitions</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void fetchJobs()}
              className="scout-btn scout-btn-sm scout-btn-secondary"
              disabled={loadingJobs}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🔄 Reload
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loadingJobs && jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <span className="spinner-inline" style={{ fontSize: '20px' }}>🔄</span>
            <div style={{ marginTop: '10px', fontSize: '14px' }}>Loading synchronization jobs...</div>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
            <strong style={{ display: 'block', color: '#0f172a', fontSize: '15px' }}>No synchronization jobs found</strong>
            <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Configure a sync above and click "Start Synchronization".</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px' }}>Competition & Season</th>
                  <th style={{ padding: '12px 10px' }}>Target & Scope</th>
                  <th style={{ padding: '12px 10px' }}>Counts (Proc / Cre / Upd / Fail)</th>
                  <th style={{ padding: '12px 10px' }}>Initiator</th>
                  <th style={{ padding: '12px 10px' }}>Started / Duration</th>
                  <th style={{ padding: '12px 10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const durationSec =
                    job.startedAt && job.completedAt
                      ? Math.max(0, Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000))
                      : null;

                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 10px' }}>{renderStatusBadge(job.status)}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{job.competitionName || 'Competition'}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{job.seasonCode || job.seasonId}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{job.target}</span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          Scope: {job.scope} ({job.mode})
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          <span style={{ color: '#0f172a' }}>{job.processedCount}</span> /{' '}
                          <span style={{ color: '#16a34a' }}>{job.createdCount}</span> /{' '}
                          <span style={{ color: '#2563eb' }}>{job.updatedCount}</span> /{' '}
                          <span style={{ color: job.failedCount > 0 ? '#dc2626' : '#64748b', fontWeight: job.failedCount > 0 ? 700 : 400 }}>
                            {job.failedCount}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#475569' }}>
                        {job.initiatedByName || (job.initiatedBy ? 'Admin' : 'System')}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '12px', color: '#475569' }}>
                        <div>{job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : '—'}</div>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {durationSec !== null ? `${durationSec}s` : job.status === 'RUNNING' ? 'Running...' : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <button
                          type="button"
                          className="scout-btn scout-btn-sm scout-btn-secondary"
                          onClick={() => void handleViewJobDetail(job.id)}
                          disabled={loadingDetail}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {loadingDetail && selectedJob?.id === job.id ? 'Loading...' : '🔍 Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
            <span>
              Showing {totalJobs === 0 ? 0 : pageOffset + 1} to {Math.min(pageOffset + pageLimit, totalJobs)} of {totalJobs} jobs
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Show:</span>
              <select
                className="scout-select"
                value={pageLimit}
                onChange={(e) => {
                  setPageLimit(Number(e.target.value));
                  setPageOffset(0);
                }}
                style={{ fontSize: '12px', padding: '2px 8px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="scout-btn scout-btn-sm scout-btn-secondary"
              onClick={() => setPageOffset((prev) => Math.max(0, prev - pageLimit))}
              disabled={pageOffset === 0 || loadingJobs}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Page {Math.floor(pageOffset / pageLimit) + 1} of {Math.max(1, Math.ceil(totalJobs / pageLimit))}
            </span>
            <button
              type="button"
              className="scout-btn scout-btn-sm scout-btn-secondary"
              onClick={() => setPageOffset((prev) => prev + pageLimit)}
              disabled={pageOffset + pageLimit >= totalJobs || loadingJobs}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR EXPENSIVE FULL BACKFILL */}
      {showConfirmModal && (
        <div
          className="scout-modal-clean-overlay"
          onClick={() => setShowConfirmModal(false)}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '480px' }}
          >
            <div className="scout-modal-clean-header" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>⚠️</span>
                <h3 className="scout-modal-clean-title">Confirm Full Season Sync</h3>
              </div>
              <button
                type="button"
                className="scout-modal-clean-close-btn"
                aria-label="Close"
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              You are about to trigger a <strong>FULL season backfill</strong> for <strong>{selectedCompObj?.name}</strong> ({selectedSeasonObj?.seasonCode}).
            </p>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', fontSize: '12.5px', color: '#334155', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div>• Target: <strong>FULL (Matches → Statistics → Season Aggregation)</strong></div>
              <div>• Mode: <strong>{mode}</strong></div>
              <div>• Scope: <strong>SEASON</strong></div>
            </div>
            <div className="scout-modal-clean-footer">
              <button
                type="button"
                className="scout-btn scout-btn-md scout-btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={triggering}
              >
                Cancel
              </button>
              <button
                type="button"
                className="scout-btn scout-btn-md scout-btn-primary"
                onClick={() => void executeTrigger()}
                disabled={triggering}
              >
                Confirm & Run Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOB DETAIL & AUDIT LOGS MODAL */}
      {selectedJob && (
        <div
          className="scout-modal-clean-overlay"
          onClick={() => setSelectedJob(null)}
          role="presentation"
        >
          <div
            className="scout-modal-clean-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '920px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Sync Job Details
                </h3>
                {renderStatusBadge(selectedJob.status)}
              </div>
              <button
                type="button"
                className="scout-btn scout-btn-sm scout-btn-secondary"
                onClick={() => setSelectedJob(null)}
                style={{ fontSize: '16px', padding: '4px 10px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Error Banner if Present */}
              {selectedJob.errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' }}>
                  <strong>Execution Error:</strong> {selectedJob.errorMessage}
                </div>
              )}

              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Job ID</span>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all' }}>{selectedJob.id}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Competition & Season</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    {selectedJob.competitionName || selectedJob.competitionId} ({selectedJob.seasonCode || selectedJob.seasonId})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Target & Scope</span>
                  <div style={{ fontSize: '13px', color: '#0f172a' }}>
                    <strong>{selectedJob.target}</strong> / {selectedJob.scope} ({selectedJob.mode})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Initiated By</span>
                  <div style={{ fontSize: '13px', color: '#0f172a' }}>
                    {selectedJob.initiatedByName || selectedJob.initiatedBy || 'System / Scheduler'}
                  </div>
                </div>
              </div>

              {/* Execution Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Processed</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{selectedJob.processedCount}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#166534' }}>Created</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803d' }}>{selectedJob.createdCount}</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#1e40af' }}>Updated</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{selectedJob.updatedCount}</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#991b1b' }}>Failed</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: selectedJob.failedCount > 0 ? '#dc2626' : '#64748b' }}>
                    {selectedJob.failedCount}
                  </div>
                </div>
              </div>

              {/* Chronological Audit Logs */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span> Pipeline Event Logs ({selectedJob.logs?.length || 0})
                </h4>

                {!selectedJob.logs || selectedJob.logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                    No audit logs available for this job.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <tr>
                          <th style={{ padding: '8px 12px' }}>Time</th>
                          <th style={{ padding: '8px 12px' }}>Level</th>
                          <th style={{ padding: '8px 12px' }}>Entity</th>
                          <th style={{ padding: '8px 12px' }}>Message</th>
                          <th style={{ padding: '8px 12px' }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJob.logs.map((log) => {
                          const isExpanded = expandedLogId === log.id;
                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  className="scout-badge"
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    background:
                                      log.level === 'ERROR' ? '#fef2f2' : log.level === 'WARN' ? '#fffbeb' : '#eff6ff',
                                    color:
                                      log.level === 'ERROR' ? '#dc2626' : log.level === 'WARN' ? '#d97706' : '#2563eb',
                                  }}
                                >
                                  {log.level}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>
                                {log.entityType || '—'}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#0f172a' }}>{log.message}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {log.details ? (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {isExpanded ? 'Hide' : 'View'}
                                    </button>
                                    {isExpanded && (
                                      <pre
                                        style={{
                                          background: '#0f172a',
                                          color: '#38bdf8',
                                          padding: '8px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          marginTop: '6px',
                                          maxHeight: '140px',
                                          overflowY: 'auto',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-all',
                                        }}
                                      >
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                className="scout-btn scout-btn-secondary"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
