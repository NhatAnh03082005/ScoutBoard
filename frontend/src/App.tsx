import { useState, useEffect, Suspense, lazy } from 'react';
import {
  getMeApi,
  refreshTokenApi,
  logoutApi,
  getAdminUsersApi,
  updateUserStatusApi,
  unlockUserApi,
  updateUserRolesApi,
} from './services/api';
import type { UserProfile } from './services/api';

import { LoadingState } from './components/common/LoadingState';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Eagerly loaded landing page (lightweight, ensures instant FCP for root visitor)
import { HomePage } from './pages/HomePage';

// Route-level lazy-loaded pages
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const PlayerSearchPage = lazy(() =>
  import('./pages/PlayerSearchPage').then((m) => ({ default: m.PlayerSearchPage })),
);
const MyShortlistsPage = lazy(() =>
  import('./pages/MyShortlistsPage').then((m) => ({ default: m.MyShortlistsPage })),
);
const ShortlistDetailPage = lazy(() =>
  import('./pages/ShortlistDetailPage').then((m) => ({ default: m.ShortlistDetailPage })),
);
const MySquadsPage = lazy(() =>
  import('./pages/MySquadsPage').then((m) => ({ default: m.MySquadsPage })),
);
const SquadDetailPage = lazy(() =>
  import('./pages/SquadDetailPage').then((m) => ({ default: m.SquadDetailPage })),
);
const AdminDataSyncPage = lazy(() =>
  import('./pages/AdminDataSyncPage').then((m) => ({ default: m.AdminDataSyncPage })),
);

export type TabType =
  | 'home'
  | 'players'
  | 'shortlists'
  | 'squads'
  | 'profile'
  | 'users'
  | 'data-sync'
  | 'admin'
  | 'login'
  | 'register';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [selectedShortlistId, setSelectedShortlistId] = useState<string | null>(null);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedPlayerIdForSearch, setSelectedPlayerIdForSearch] = useState<string | null>(null);

  // Global Session State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken'),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Admin Management State
  const [adminSubTab, setAdminSubTab] = useState<'data-sync' | 'users'>('users');
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
  const isUser = !!user && !isAdmin;
  const isGuest = !user;

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
          const userIsAdmin =
            profile?.roles?.includes('ADMIN') ??
            profile?.userRoles?.some((ur: any) => ur.role?.code === 'ADMIN') ??
            false;
          if (userIsAdmin) {
            setActiveTab((prev) =>
              prev === 'profile' || prev === 'data-sync' || prev === 'users' ? prev : 'users',
            );
          }
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
              const userIsAdmin =
                profile?.roles?.includes('ADMIN') ??
                profile?.userRoles?.some((ur: any) => ur.role?.code === 'ADMIN') ??
                false;
              if (userIsAdmin) {
                setActiveTab((prev) =>
                  prev === 'profile' || prev === 'data-sync' || prev === 'users' ? prev : 'users',
                );
              }
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

    // Check URL path for direct navigation
    const rawPath = window.location.pathname.toLowerCase();
    const match = rawPath.match(/\/(?:myshortlists|shortlists)\/([a-zA-Z0-9-]+)/i);
    const squadMatch = rawPath.match(/\/(?:mysquads|squads)\/([a-zA-Z0-9-]+)/i);
    if (match && match[1]) {
      setSelectedShortlistId(match[1]);
      setActiveTab('shortlists');
    } else if (squadMatch && squadMatch[1]) {
      setSelectedSquadId(squadMatch[1]);
      setActiveTab('squads');
    } else if (rawPath.includes('shortlist') || rawPath.includes('myshortlist')) {
      setActiveTab('shortlists');
    } else if (rawPath.includes('squad') || rawPath.includes('mysquad')) {
      setActiveTab('squads');
    } else if (rawPath.includes('sync')) {
      setActiveTab('data-sync');
    } else if (
      rawPath.includes('admin') ||
      rawPath.includes('users') ||
      rawPath.includes('user-management')
    ) {
      setActiveTab('users');
    } else if (rawPath.includes('profile')) {
      setActiveTab('profile');
    } else if (rawPath.includes('home') || rawPath.includes('about')) {
      setActiveTab('home');
    } else if (rawPath.includes('players')) {
      setActiveTab('players');
    }
  }, []);

  // Guard activeTab whenever auth state (user / role) changes
  useEffect(() => {
    if (isAdmin) {
      // ADMIN: Only profile, users, data-sync allowed
      if (
        activeTab === 'home' ||
        activeTab === 'players' ||
        activeTab === 'shortlists' ||
        activeTab === 'squads'
      ) {
        setActiveTab('users');
      }
    }
  }, [isAdmin, activeTab]);

  // Fetch admin user list when User Management or Admin Tab is active or filters change
  useEffect(() => {
    if (
      (activeTab === 'users' || activeTab === 'admin') &&
      accessToken &&
      isAdmin
    ) {
      fetchAdminUsers();
    }
  }, [activeTab, accessToken, isAdmin, adminSearch, adminStatusFilter, adminRoleFilter]);

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
      <ErrorBoundary>
        <Suspense fallback={<LoadingState message="Loading authentication..." />}>
          <LoginPage
            initialMode={activeTab === 'register' ? 'register' : 'login'}
            onLoginSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              const token =
                localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken');
              if (token) setAccessToken(token);
              const userIsAdmin =
                loggedInUser?.roles?.includes('ADMIN') ??
                loggedInUser?.userRoles?.some((ur: any) => ur.role?.code === 'ADMIN') ??
                false;
              setActiveTab(userIsAdmin ? 'users' : 'players');
            }}
            onNavigateHome={() => setActiveTab(isAdmin ? 'users' : 'players')}
          />
        </Suspense>
      </ErrorBoundary>
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
              setActiveTab(isAdmin ? 'users' : 'players');
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
            {/* GUEST & USER: About */}
            {!isAdmin && (
              <button
                type="button"
                id="nav-link-home"
                className={`scout-nav-link ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('home');
                  window.history.pushState({}, '', '/');
                  setError(null);
                  setSuccess(null);
                }}
              >
                About
              </button>
            )}

            {/* GUEST & USER: Find Players */}
            {!isAdmin && (
              <button
                type="button"
                id="nav-link-players"
                className={`scout-nav-link ${activeTab === 'players' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('players');
                  window.history.pushState({}, '', '/players');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Find Players
              </button>
            )}

            {/* USER ONLY: My Shortlists */}
            {isUser && (
              <button
                type="button"
                id="nav-link-shortlists"
                className={`scout-nav-link ${activeTab === 'shortlists' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('shortlists');
                  setSelectedShortlistId(null);
                  window.history.pushState({}, '', '/MyShortlists');
                  setError(null);
                  setSuccess(null);
                }}
              >
                My Shortlists
              </button>
            )}

            {/* USER ONLY: My Squads */}
            {isUser && (
              <button
                type="button"
                id="nav-link-squads"
                className={`scout-nav-link ${activeTab === 'squads' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('squads');
                  setSelectedSquadId(null);
                  window.history.pushState({}, '', '/MySquads');
                  setError(null);
                  setSuccess(null);
                }}
              >
                My Squads
              </button>
            )}

            {/* ADMIN ONLY: Profile, User Management, Data Sync */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  id="nav-link-admin-profile"
                  className={`scout-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('profile');
                    window.history.pushState({}, '', '/profile');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Profile
                </button>

                <button
                  type="button"
                  id="nav-link-admin-users"
                  className={`scout-nav-link ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('users');
                    window.history.pushState({}, '', '/admin/users');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  User Management
                </button>

                <button
                  type="button"
                  id="nav-link-admin-sync"
                  className={`scout-nav-link ${activeTab === 'data-sync' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('data-sync');
                    window.history.pushState({}, '', '/admin/data-sync');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Data Sync
                </button>
              </>
            )}

            {/* USER ONLY: Profile */}
            {isUser && (
              <button
                type="button"
                id="nav-link-profile"
                className={`scout-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('profile');
                  window.history.pushState({}, '', '/profile');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Profile
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

        <ErrorBoundary>
          <Suspense fallback={<LoadingState message="Loading page..." />}>
            {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          isAdmin ? (
            <div className="scout-auth-guard-card" id="admin-restricted-guard" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Restricted</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Administrator accounts are restricted to Profile, User Management, and Data Sync only.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('users')}>
                Go to User Management
              </button>
            </div>
          ) : (
            <HomePage
              onNavigateToSearch={() => setActiveTab('players')}
              onNavigateToLogin={() => setActiveTab('login')}
              isAuthenticated={!!user}
            />
          )
        )}

        {/* 2. PLAYERS TAB */}
        {activeTab === 'players' && (
          isAdmin ? (
            <div className="scout-auth-guard-card" id="admin-restricted-guard" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Restricted</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Administrator accounts are restricted to Profile, User Management, and Data Sync only.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('users')}>
                Go to User Management
              </button>
            </div>
          ) : (
            <PlayerSearchPage
              initialPlayerId={selectedPlayerIdForSearch}
              onClearInitialPlayerId={() => setSelectedPlayerIdForSearch(null)}
              isAuthenticated={!!user}
              onNavigateToLogin={() => setActiveTab('login')}
            />
          )
        )}

        {/* 3. SHORTLISTS TAB */}
        {activeTab === 'shortlists' && (
          isAdmin ? (
            <div className="scout-auth-guard-card" id="admin-restricted-guard" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Restricted</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Administrator accounts are restricted to Profile, User Management, and Data Sync only.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('users')}>
                Go to User Management
              </button>
            </div>
          ) : !user ? (
            <div className="scout-auth-guard-card" id="auth-guard-shortlists" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Authentication Required</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Please log in to manage your scouting shortlists.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('login')}>
                Log In
              </button>
            </div>
          ) : selectedShortlistId ? (
            <ShortlistDetailPage
              shortlistId={selectedShortlistId}
              onBack={() => {
                setSelectedShortlistId(null);
                window.history.pushState({}, '', '/MyShortlists');
              }}
              onSelectPlayer={(playerId) => {
                setSelectedPlayerIdForSearch(playerId);
                setActiveTab('players');
                window.history.pushState({}, '', '/players/' + playerId);
              }}
              onNavigateToSearch={() => {
                setActiveTab('players');
                window.history.pushState({}, '', '/players');
              }}
              isAuthenticated={!!user}
              onNavigateToLogin={() => setActiveTab('login')}
            />
          ) : (
            <MyShortlistsPage
              onOpenShortlist={(id) => {
                setSelectedShortlistId(id);
                window.history.pushState({}, '', `/MyShortlists/${id}`);
              }}
              isAuthenticated={!!user}
              onNavigateToLogin={() => setActiveTab('login')}
            />
          )
        )}

        {/* 4. SQUADS TAB */}
        {activeTab === 'squads' && (
          isAdmin ? (
            <div className="scout-auth-guard-card" id="admin-restricted-guard" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Restricted</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Administrator accounts are restricted to Profile, User Management, and Data Sync only.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('users')}>
                Go to User Management
              </button>
            </div>
          ) : !user ? (
            <div className="scout-auth-guard-card" id="auth-guard-squads" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Authentication Required</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Please log in to manage your tactical squads.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('login')}>
                Log In
              </button>
            </div>
          ) : selectedSquadId ? (
            <SquadDetailPage
              squadId={selectedSquadId}
              onBack={() => {
                setSelectedSquadId(null);
                window.history.pushState({}, '', '/MySquads');
              }}
              isAuthenticated={!!user}
              onNavigateToLogin={() => setActiveTab('login')}
            />
          ) : (
            <MySquadsPage
              onOpenSquad={(id) => {
                setSelectedSquadId(id);
                window.history.pushState({}, '', `/MySquads/${id}`);
              }}
              isAuthenticated={!!user}
              onNavigateToLogin={() => setActiveTab('login')}
            />
          )
        )}

        {/* 5. PROFILE TAB */}
        {activeTab === 'profile' && (
          !user ? (
            <div className="scout-auth-guard-card" id="auth-guard-profile" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Authentication Required</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Please log in to view your profile.
              </p>
              <button type="button" className="scout-btn scout-btn-primary" onClick={() => setActiveTab('login')}>
                Log In
              </button>
            </div>
          ) : (
            <div className="scout-profile-container" style={{ maxWidth: '800px', margin: '32px auto', padding: '0 16px' }}>
              <div className="card scout-card" style={{ background: 'var(--scout-surface-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--scout-border-default)', boxShadow: 'var(--scout-shadow-subtle)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffffff', fontWeight: 700 }}>Account Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Email</span>
                    <strong style={{ color: '#ffffff' }}>{user.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Full Name</span>
                    <strong style={{ color: '#ffffff' }}>{user.fullName || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
                    <span className="scout-badge scout-badge-active" style={{ marginTop: '4px' }}>{user.status}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Roles</span>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {user.roles?.map((r) => (
                        <span key={r} className="scout-badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* 6. USER MANAGEMENT TAB */}
        {(activeTab === 'users' || (activeTab === 'admin' && adminSubTab === 'users')) && (
          !isAdmin ? (
            <div className="scout-auth-guard-card" id="user-mgmt-access-denied" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Denied</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                {isGuest ? 'You must be logged in as an Administrator to access User Management.' : 'Administrator privileges are required to access User Management.'}
              </p>
              <button
                type="button"
                className="scout-btn scout-btn-primary"
                onClick={() => setActiveTab(isGuest ? 'login' : 'players')}
              >
                {isGuest ? 'Log In' : 'Back to Find Players'}
              </button>
            </div>
          ) : (
            <div className="scout-admin-container" style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 16px' }}>
              {/* Admin Sub-Tabs Navigation */}
              <div className="scout-tabs-list" style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  id="tab-btn-user-mgmt"
                  className="scout-tab-btn active"
                  onClick={() => {
                    setActiveTab('users');
                    setAdminSubTab('users');
                  }}
                >
                  <span>👥</span> User Management
                </button>
                <button
                  type="button"
                  id="tab-btn-data-sync"
                  className="scout-tab-btn"
                  onClick={() => {
                    setActiveTab('data-sync');
                    setAdminSubTab('data-sync');
                  }}
                >
                  <span>⚡</span> Data Synchronization
                </button>
              </div>

              {/* User Management Filters */}
              <div className="card scout-card" style={{ background: 'var(--scout-surface-control)', borderRadius: '16px', padding: '20px', border: '1px solid var(--scout-border-default)', boxShadow: 'var(--scout-shadow-subtle)', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#ffffff', fontWeight: 700 }}>User Management Filters</h3>
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
              <div className="card scout-card" style={{ background: 'var(--scout-surface-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--scout-border-default)', boxShadow: 'var(--scout-shadow-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontWeight: 700 }}>User List ({adminUsers.length})</h3>
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
                      <tr style={{ borderBottom: '1px solid var(--scout-border-default)', color: 'var(--scout-text-muted)', fontSize: '12px' }}>
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
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--scout-border-subtle)', fontSize: '13px' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 600, color: '#ffffff' }}>{u.email}</td>
                            <td style={{ padding: '10px 8px', color: 'var(--scout-text-secondary)' }}>{u.fullName || '—'}</td>
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
                <div
                  className="scout-modal-clean-overlay"
                  onClick={() => {
                    setSelectedUserForModal(null);
                    setIsUnlockAction(false);
                  }}
                  role="presentation"
                >
                  <div
                    className="scout-modal-clean-dialog"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    style={{ maxWidth: '440px' }}
                  >
                    <div className="scout-modal-clean-header" style={{ marginBottom: '14px' }}>
                      <h3 className="scout-modal-clean-title">Confirm Action</h3>
                      <button
                        type="button"
                        className="scout-modal-clean-close-btn"
                        aria-label="Close"
                        onClick={() => {
                          setSelectedUserForModal(null);
                          setIsUnlockAction(false);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <p style={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '24px' }}>
                      Are you sure you want to unlock user <strong>{selectedUserForModal.email}</strong>?
                    </p>
                    <div className="scout-modal-clean-footer">
                      <button
                        type="button"
                        className="scout-btn scout-btn-md scout-btn-secondary"
                        onClick={() => {
                          setSelectedUserForModal(null);
                          setIsUnlockAction(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="scout-btn scout-btn-md scout-btn-primary"
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
          )
        )}

        {/* 7. DATA SYNC TAB */}
        {(activeTab === 'data-sync' || (activeTab === 'admin' && adminSubTab === 'data-sync')) && (
          !isAdmin ? (
            <div className="scout-auth-guard-card" id="data-sync-access-denied" style={{ maxWidth: '600px', margin: '48px auto', textAlign: 'center', padding: '40px 24px', background: 'var(--scout-surface-card)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Access Denied</h2>
              <p style={{ color: 'var(--scout-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                Administrator privileges are required to access Data Synchronization.
              </p>
              <button
                type="button"
                className="scout-btn scout-btn-primary"
                onClick={() => setActiveTab(isGuest ? 'login' : 'players')}
              >
                {isGuest ? 'Log In' : 'Back to Find Players'}
              </button>
            </div>
          ) : accessToken ? (
            <div className="scout-admin-container" style={{ maxWidth: '1240px', margin: '24px auto', padding: '0 16px' }}>
              {/* Admin Sub-Tabs Navigation */}
              <div className="scout-tabs-list" style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  id="tab-btn-user-mgmt"
                  className="scout-tab-btn"
                  onClick={() => {
                    setActiveTab('users');
                    setAdminSubTab('users');
                  }}
                >
                  <span>👥</span> User Management
                </button>
                <button
                  type="button"
                  id="tab-btn-data-sync"
                  className="scout-tab-btn active"
                  onClick={() => {
                    setActiveTab('data-sync');
                    setAdminSubTab('data-sync');
                  }}
                >
                  <span>⚡</span> Data Synchronization
                </button>
              </div>
              <AdminDataSyncPage accessToken={accessToken} />
            </div>
          ) : null
        )}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
