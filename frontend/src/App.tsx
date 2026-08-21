import { useState, useEffect } from 'react';
import {
  getMeApi,
  refreshTokenApi,
  logoutApi,
  verifyEmailApi,
  resendVerificationOtpApi,
  getAdminUsersApi,
  updateUserStatusApi,
  unlockUserApi,
  updateUserRolesApi,
} from './services/api';
import type { UserProfile } from './services/api';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PlayerSearchPage } from './pages/PlayerSearchPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'players' | 'profile' | 'admin' | 'login' | 'register'>('players');

  // Global Session State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken'),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Inline OTP verification state on Profile Tab
  const [profileOtpCode, setProfileOtpCode] = useState('');
  const [profileOtpLoading, setProfileOtpLoading] = useState(false);

  // Admin Management State
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserProfile | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isUnlockAction, setIsUnlockAction] = useState<boolean>(false);

  const isAdmin =
    user?.roles?.includes('ADMIN') ??
    user?.userRoles?.some((ur) => ur.role?.code === 'ADMIN') ??
    false;

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      const storedToken =
        localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          const profile = await getMeApi(storedToken);
          setUser(profile);
          setAccessToken(storedToken);
        } catch {
          // Attempt refresh
          const storedRefresh =
            localStorage.getItem('scout_refresh_token') || localStorage.getItem('refreshToken');
          if (storedRefresh) {
            try {
              const res = await refreshTokenApi(storedRefresh);
              localStorage.setItem('scout_access_token', res.accessToken);
              localStorage.setItem('scout_refresh_token', res.refreshToken);
              setAccessToken(res.accessToken);
              const profile = await getMeApi(res.accessToken);
              setUser(profile);
            } catch {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      }
    };

    void initAuth();
  }, []);

  // Fetch admin user list when Admin Tab is active or filters change
  useEffect(() => {
    if (activeTab === 'admin' && accessToken && isAdmin) {
      fetchAdminUsers();
    }
  }, [activeTab, adminSearch, adminStatusFilter, adminRoleFilter]);

  const fetchAdminUsers = async () => {
    if (!accessToken) return;
    try {
      const usersList = await getAdminUsersApi(
        accessToken,
        adminSearch,
        adminStatusFilter,
        adminRoleFilter,
      );
      setAdminUsers(usersList);
    } catch (err: any) {
      setError(err.message || 'Failed to load user management list.');
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('scout_access_token');
    localStorage.removeItem('scout_refresh_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setUser(null);
    setActiveTab('players');
  };

  const handleLogout = async () => {
    setLoading(true);
    const storedRefresh =
      localStorage.getItem('scout_refresh_token') || localStorage.getItem('refreshToken');
    if (accessToken && storedRefresh) {
      try {
        await logoutApi(accessToken, storedRefresh);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setSuccess('Signed out successfully!');
    setLoading(false);
  };

  // Inline OTP verification on Profile tab (for unverified accounts)
  const handleVerifyEmailOnProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !profileOtpCode) return;
    setProfileOtpLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await verifyEmailApi(user.email, profileOtpCode);
      setSuccess(res.message || 'Email verified successfully!');
      if (accessToken) {
        const refreshed = await getMeApi(accessToken);
        setUser(refreshed);
      }
      setProfileOtpCode('');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setProfileOtpLoading(false);
    }
  };

  const handleResendOtpOnProfile = async () => {
    if (!user?.email) return;
    setProfileOtpLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await resendVerificationOtpApi(user.email);
      setSuccess(res.message || 'OTP code resent successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP code.');
    } finally {
      setProfileOtpLoading(false);
    }
  };

  // --- Admin Actions ---
  const confirmModalAction = async () => {
    if (!selectedUserForModal || !accessToken) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isUnlockAction) {
        await unlockUserApi(accessToken, selectedUserForModal.id);
        setSuccess(`Unlocked account ${selectedUserForModal.email} successfully!`);
      } else if (pendingStatus) {
        await updateUserStatusApi(accessToken, selectedUserForModal.id, pendingStatus);
        setSuccess(
          `Updated status of ${selectedUserForModal.email} to ${pendingStatus}!`,
        );
      }
      setSelectedUserForModal(null);
      setPendingStatus(null);
      setIsUnlockAction(false);
      await fetchAdminUsers();
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminRole = async (targetUser: UserProfile) => {
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const hasAdmin =
      targetUser.roles?.includes('ADMIN') ??
      targetUser.userRoles?.some((ur) => ur.role?.code === 'ADMIN') ??
      false;
    const newRoles = hasAdmin ? ['USER'] : ['USER', 'ADMIN'];

    try {
      await updateUserRolesApi(accessToken, targetUser.id, newRoles);
      setSuccess(
        `Updated roles of ${targetUser.email} to [${newRoles.join(', ')}]!`,
      );
      await fetchAdminUsers();
    } catch (err: any) {
      setError(err.message || 'Role update failed.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Render Dedicated Login Page Component for Auth View
  if (!user && (activeTab === 'login' || activeTab === 'register')) {
    return (
      <LoginPage
        initialMode={activeTab === 'register' ? 'register' : 'login'}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          const token =
            localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken');
          if (token) setAccessToken(token);
          setActiveTab('players');
        }}
        onNavigateHome={() => setActiveTab('players')}
      />
    );
  }

  // 2. Render Main Application Layout with Global Public Shell
  return (
    <div className="scout-app-shell">
      {/* Global Top Navbar */}
      <header className="scout-navbar">
        <div className="scout-navbar-container">
          {/* Brand Logo */}
          <div
            className="scout-navbar-brand"
            onClick={() => {
              setActiveTab('players');
              setError(null);
              setSuccess(null);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="scout-navbar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" />
              </svg>
            </div>
            <span className="scout-navbar-brand-name">ScoutBoard</span>
          </div>

          {/* Left / Center Navigation Links */}
          <nav className="scout-navbar-nav">
            <button
              type="button"
              className={`scout-nav-link ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('home');
                setError(null);
                setSuccess(null);
              }}
            >
              About
            </button>

            <button
              type="button"
              className={`scout-nav-link ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('players');
                setError(null);
                setSuccess(null);
              }}
            >
              Find Players
            </button>

            {user && (
              <button
                type="button"
                className={`scout-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('profile');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Profile
              </button>
            )}

            {user && isAdmin && (
              <button
                type="button"
                className={`scout-nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('admin');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Right Auth / Account Actions */}
          <div className="scout-navbar-auth">
            {user ? (
              <div className="scout-navbar-user-group">
                <span className="scout-navbar-user-email">
                  {user.fullName || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="scout-navbar-btn-logout"
                  disabled={loading}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="scout-navbar-guest-group">
                <button
                  type="button"
                  className={`scout-navbar-btn-text ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('register');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  className="scout-navbar-btn-primary"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Alerts */}
      <div className="scout-shell-content">
        {error && <div className="alert-banner alert-error" style={{ maxWidth: '1360px', margin: '16px auto' }}>⚠️ {error}</div>}
        {success && <div className="alert-banner alert-success" style={{ maxWidth: '1360px', margin: '16px auto' }}>✅ {success}</div>}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          <HomePage
            onNavigateToSearch={() => setActiveTab('players')}
            onNavigateToLogin={() => setActiveTab('login')}
            isAuthenticated={!!user}
          />
        )}

        {/* 2. PLAYERS TAB */}
        {activeTab === 'players' && <PlayerSearchPage />}

        {/* 3. PROFILE TAB */}
        {activeTab === 'profile' && user && (
          <div className="scout-profile-container" style={{ maxWidth: '800px', margin: '32px auto', padding: '0 16px' }}>
            {user.isEmailVerified ? (
              <div className="alert-banner alert-success" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🛡️ <strong>Verified Account:</strong> {user.email}</span>
                <span className="scout-badge scout-badge-active" style={{ fontSize: '11px' }}>VERIFIED</span>
              </div>
            ) : (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                      <h4 style={{ margin: 0, color: '#fca5a5', fontSize: '15px', fontWeight: 700 }}>Email Not Verified</h4>
                      <p style={{ margin: '2px 0 0', color: '#fecaca', fontSize: '13px' }}>Please verify the 6-digit OTP code sent to <strong>{user.email}</strong> to unlock full features.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendOtpOnProfile}
                    disabled={profileOtpLoading}
                    className="scout-btn scout-btn-sm scout-btn-secondary"
                    style={{ whiteSpace: 'nowrap', margin: 0 }}
                  >
                    {profileOtpLoading ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>

                <form onSubmit={handleVerifyEmailOnProfile} style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <input
                    type="text"
                    className="scout-input"
                    style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', maxWidth: '180px' }}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    value={profileOtpCode}
                    onChange={(e) => setProfileOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                  <button
                    type="submit"
                    className="scout-btn scout-btn-sm"
                    disabled={profileOtpLoading || profileOtpCode.length !== 6}
                    style={{ margin: 0 }}
                  >
                    {profileOtpLoading ? 'Verifying...' : 'Verify Now'}
                  </button>
                </form>
              </div>
            )}

            <div className="card" style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>Account Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Email</span>
                  <strong style={{ color: '#0f172a' }}>{user.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Full Name</span>
                  <strong style={{ color: '#0f172a' }}>{user.fullName || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                  <span className="scout-badge scout-badge-active" style={{ marginTop: '4px' }}>{user.status}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Roles</span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {user.roles?.map((r) => (
                      <span key={r} className="scout-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ADMIN TAB */}
        {activeTab === 'admin' && user && isAdmin && (
          <div className="scout-admin-container" style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
            <div className="card" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>User Management Filters</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <input
                  type="text"
                  className="scout-input"
                  placeholder="Search by email, name..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
                <select
                  className="scout-select"
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                <select
                  className="scout-select"
                  value={adminRoleFilter}
                  onChange={(e) => setAdminRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>
            </div>

            {/* Admin Table */}
            <div className="card" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>User List ({adminUsers.length})</h3>
                <button
                  type="button"
                  onClick={fetchAdminUsers}
                  className="scout-btn scout-btn-sm scout-btn-secondary"
                >
                  🔄 Reload
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                      <th style={{ padding: '10px 8px' }}>Email</th>
                      <th style={{ padding: '10px 8px' }}>Full Name</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                      <th style={{ padding: '10px 8px' }}>Roles</th>
                      <th style={{ padding: '10px 8px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => {
                      const userIsAdmin = u.roles?.includes('ADMIN') ?? u.userRoles?.some((ur) => ur.role?.code === 'ADMIN');
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: '#0f172a' }}>{u.email}</td>
                          <td style={{ padding: '10px 8px', color: '#475569' }}>{u.fullName || '—'}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className={`scout-badge ${u.status === 'ACTIVE' ? 'scout-badge-active' : 'scout-badge-locked'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className="scout-badge" style={{ background: userIsAdmin ? '#fef3c7' : '#eff6ff', color: userIsAdmin ? '#92400e' : '#1d4ed8' }}>
                              {userIsAdmin ? 'ADMIN' : 'USER'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {u.status === 'LOCKED' && (
                                <button
                                  type="button"
                                  className="scout-btn scout-btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '11px', background: '#22c55e' }}
                                  onClick={() => {
                                    setSelectedUserForModal(u);
                                    setIsUnlockAction(true);
                                  }}
                                >
                                  Unlock
                                </button>
                              )}
                              <button
                                type="button"
                                className="scout-btn scout-btn-sm scout-btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => handleToggleAdminRole(u)}
                              >
                                {userIsAdmin ? 'Demote to USER' : 'Promote to ADMIN'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unlock Modal */}
            {selectedUserForModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>Confirm Action</h4>
                  <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>
                    Are you sure you want to unlock user <strong>{selectedUserForModal.email}</strong>?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="scout-btn scout-btn-secondary"
                      onClick={() => {
                        setSelectedUserForModal(null);
                        setIsUnlockAction(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="scout-btn"
                      onClick={confirmModalAction}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
