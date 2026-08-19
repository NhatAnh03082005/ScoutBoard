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

import { LoginPage } from './pages/LoginPage';
import { PlayerSearchPage } from './pages/PlayerSearchPage';

export function App() {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile' | 'admin' | 'players'>('players');

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
      setError(err.message || 'Không thể tải danh sách quản lý người dùng');
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
    setSuccess('Đã đăng xuất thành công!');
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
      setSuccess(res.message || 'Xác thực email thành công!');
      if (accessToken) {
        const refreshed = await getMeApi(accessToken);
        setUser(refreshed);
      }
      setProfileOtpCode('');
    } catch (err: any) {
      setError(err.message || 'Xác thực OTP thất bại.');
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
      setSuccess(res.message || 'Đã gửi lại mã OTP thành công.');
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại mã OTP.');
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
        setSuccess(`Đã mở khóa tài khoản ${selectedUserForModal.email} thành công!`);
      } else if (pendingStatus) {
        await updateUserStatusApi(accessToken, selectedUserForModal.id, pendingStatus);
        setSuccess(
          `Đã cập nhật trạng thái tài khoản ${selectedUserForModal.email} thành ${pendingStatus}!`,
        );
      }
      setSelectedUserForModal(null);
      setPendingStatus(null);
      setIsUnlockAction(false);
      await fetchAdminUsers();
    } catch (err: any) {
      setError(err.message || 'Thao tác thất bại');
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
        `Đã cập nhật vai trò của ${targetUser.email} thành [${newRoles.join(', ')}]!`,
      );
      await fetchAdminUsers();
    } catch (err: any) {
      setError(err.message || 'Cập nhật vai trò thất bại');
    } finally {
      setLoading(false);
    }
  };

  // 1. Render Dedicated Login Page Component for Auth
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

  // 2. Render Main Application Layout (Players / Profile / Admin)
  return (
    <div className={`scout-container ${activeTab === 'admin' || activeTab === 'players' ? 'wide' : ''}`}>
      <div className="scout-header">
        <div className="scout-logo-badge">
          ⚽ ScoutBoard Platform
        </div>
        <h1 className="scout-title">
          {activeTab === 'players'
            ? 'Tìm Kiếm Cầu Thủ'
            : activeTab === 'admin'
            ? 'Quản Lý Người Dùng (Admin)'
            : 'Trạng Thái Phiên'}
        </h1>
        <p className="scout-subtitle">
          {activeTab === 'players'
            ? 'Hệ thống tìm kiếm, lọc & phân tích hồ sơ cầu thủ bóng đá'
            : activeTab === 'admin'
            ? 'Progressive Lockout & Quản lý vai trò người dùng'
            : 'Hệ thống Quản lý Token & Phân quyền RBAC'}
        </p>
      </div>

      {error && <div className="alert-banner alert-error">❌ {error}</div>}
      {success && <div className="alert-banner alert-success">✅ {success}</div>}

      {/* Main Navigation Bar */}
      <div className="scout-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('players');
            setError(null);
            setSuccess(null);
          }}
        >
          ⚽ Tìm Cầu Thủ
        </button>

        {user ? (
          <>
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setError(null);
                setSuccess(null);
              }}
            >
              👤 Cá Nhân
            </button>

            {isAdmin && (
              <button
                className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('admin');
                  setError(null);
                  setSuccess(null);
                }}
              >
                👑 Quản Lý
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccess(null);
              }}
            >
              🔑 Đăng Nhập
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccess(null);
              }}
            >
              📝 Đăng Ký
            </button>
          </>
        )}
      </div>

      {/* 1. PLAYERS TAB */}
      {activeTab === 'players' && <PlayerSearchPage />}

      {/* 2. PROFILE TAB */}
      {activeTab === 'profile' && user && (
        <div>
          {/* Email Verification Status Alert Banner */}
          {user.isEmailVerified ? (
            <div className="alert-banner alert-success" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🛡️ <strong>Tài khoản đã xác thực Email chính chủ:</strong> {user.email}</span>
              <span className="scout-badge scout-badge-active" style={{ fontSize: '11px' }}>VERIFIED</span>
            </div>
          ) : (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#fca5a5', fontSize: '15px', fontWeight: 700 }}>Tài khoản chưa được kích hoạt Email</h4>
                    <p style={{ margin: '2px 0 0', color: '#cbd5e1', fontSize: '13px' }}>Vui lòng nhập mã OTP đã nhận qua hòm thư để xác thực tài khoản của bạn.</p>
                  </div>
                </div>
                <span className="scout-badge scout-badge-disabled" style={{ fontSize: '11px' }}>UNVERIFIED</span>
              </div>

              <form onSubmit={handleVerifyEmailOnProfile} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
                <input
                  type="text"
                  className="scout-input"
                  style={{ width: '180px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                  placeholder="OTP 6 số"
                  maxLength={6}
                  value={profileOtpCode}
                  onChange={(e) => setProfileOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <button
                  type="submit"
                  disabled={profileOtpLoading || !profileOtpCode}
                  className="scout-btn scout-btn-sm"
                  style={{ width: 'auto' }}
                >
                  {profileOtpLoading ? 'Đang kích hoạt...' : 'Kích Hoạt Ngay'}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtpOnProfile}
                  disabled={profileOtpLoading}
                  className="scout-btn scout-btn-secondary scout-btn-sm"
                  style={{ width: 'auto' }}
                >
                  Gửi Lại OTP
                </button>
              </form>
            </div>
          )}

          <div className="scout-card">
            <h3 style={{ marginBottom: '16px', color: '#f8fafc' }}>Thông Tin Người Dùng</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><strong>Họ và tên:</strong> {user.fullName}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div>
                <strong>Trạng thái Email:</strong>{' '}
                {user.isEmailVerified ? (
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>Đã xác thực</span>
                ) : (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>Chưa xác thực</span>
                )}
              </div>
              <div>
                <strong>Vai trò:</strong>{' '}
                {user.roles?.join(', ') ||
                  user.userRoles?.map((r) => r.role?.name || r.role?.code).join(', ') ||
                  'USER'}
              </div>
              <div><strong>ID Tài khoản:</strong> <code>{user.id}</code></div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button
                className="scout-btn scout-btn-secondary"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : '🚪 Đăng Xuất'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN MANAGEMENT TAB */}
      {activeTab === 'admin' && isAdmin && (
        <div>
          <div className="scout-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#f8fafc', margin: 0 }}>Quản Lý Người Dùng & Progressive Lockout</h3>
              <button
                className="scout-btn scout-btn-secondary scout-btn-sm"
                style={{ width: 'auto' }}
                onClick={fetchAdminUsers}
                disabled={loading}
              >
                🔄 Làm Mới
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <input
                type="text"
                className="scout-input"
                placeholder="🔍 Tìm theo email hoặc tên..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              <select
                className="scout-select"
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="DISABLED">Vô hiệu hóa (DISABLED)</option>
                <option value="LOCKED">Khóa tạm thời (LOCKED)</option>
              </select>
              <select
                className="scout-select"
                value={adminRoleFilter}
                onChange={(e) => setAdminRoleFilter(e.target.value)}
              >
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="USER">Người dùng (USER)</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="scout-table-container">
            <table className="scout-table">
              <thead>
                <tr>
                  <th>Email / Họ Tên</th>
                  <th>Vai Trò</th>
                  <th>Trạng Thái</th>
                  <th>Email Verified</th>
                  <th>Lần Thử Sai</th>
                  <th>Khóa Tạm Đến</th>
                  <th style={{ textAlign: 'right' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => {
                  const effectiveStatus = u.effectiveStatus || u.status;
                  const isUserAdmin =
                    u.roles?.includes('ADMIN') ??
                    u.userRoles?.some((ur) => ur.role?.code === 'ADMIN') ??
                    false;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.email}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{u.fullName}</div>
                      </td>
                      <td>
                        <span className={`scout-badge ${isUserAdmin ? 'scout-badge-admin' : 'scout-badge-user'}`}>
                          {isUserAdmin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td>
                        <span className={`scout-badge scout-badge-${effectiveStatus.toLowerCase()}`}>
                          {effectiveStatus}
                        </span>
                      </td>
                      <td>
                        {u.isEmailVerified ? (
                          <span style={{ color: '#22c55e', fontSize: '13px' }}>✓ Đã xác thực</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '13px' }}>✕ Chưa</span>
                        )}
                      </td>
                      <td>{u.failedLoginAttempts || 0}</td>
                      <td>
                        {u.lockedUntil ? (
                          <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                            {new Date(u.lockedUntil).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {effectiveStatus === 'LOCKED' && (
                            <button
                              className="scout-btn scout-btn-sm"
                              style={{ width: 'auto', background: '#10b981', padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => {
                                setSelectedUserForModal(u);
                                setIsUnlockAction(true);
                              }}
                            >
                              🔓 Mở Khóa
                            </button>
                          )}

                          {effectiveStatus !== 'DISABLED' ? (
                            <button
                              className="scout-btn scout-btn-secondary scout-btn-sm"
                              style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                              disabled={u.id === user?.id}
                              onClick={() => {
                                setSelectedUserForModal(u);
                                setPendingStatus('DISABLED');
                                setIsUnlockAction(false);
                              }}
                            >
                              Khóa
                            </button>
                          ) : (
                            <button
                              className="scout-btn scout-btn-sm"
                              style={{ width: 'auto', background: '#3b82f6', padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => {
                                setSelectedUserForModal(u);
                                setPendingStatus('ACTIVE');
                                setIsUnlockAction(false);
                              }}
                            >
                              Kích Hoạt
                            </button>
                          )}

                          <button
                            className="scout-btn scout-btn-secondary scout-btn-sm"
                            style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                            disabled={u.id === user?.id}
                            onClick={() => handleToggleAdminRole(u)}
                          >
                            {isUserAdmin ? 'Gỡ Admin' : 'Thêm Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {adminUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {selectedUserForModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-title">
              {isUnlockAction
                ? '🔓 Xác Nhận Mở Khóa Tài Khoản'
                : '⚠️ Xác Nhận Cập Nhật Trạng Thái'}
            </h3>

            {isUnlockAction ? (
              <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
                Bạn có chắc chắn muốn <strong>MỞ KHÓA NGAY</strong> cho tài khoản{' '}
                <strong>{selectedUserForModal.email}</strong>?
                <br />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  (Thao tác này sẽ reset bộ đếm nhập sai và đưa trạng thái về ACTIVE).
                </span>
              </p>
            ) : (
              <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
                Bạn có chắc chắn muốn chuyển trạng thái tài khoản{' '}
                <strong>{selectedUserForModal.email}</strong> từ{' '}
                <span style={{ color: '#f59e0b' }}>
                  {selectedUserForModal.status}
                </span>{' '}
                thành <span style={{ color: '#22c55e' }}>{pendingStatus}</span> không?
              </p>
            )}

            {!isUnlockAction &&
              selectedUserForModal.id === user?.id &&
              pendingStatus !== 'ACTIVE' && (
                <div className="alert-banner alert-error" style={{ marginBottom: 0 }}>
                  ⛔ <strong>Ràng buộc A5.1</strong>: Bạn KHÔNG THỂ tự vô hiệu hóa hoặc khóa chính tài khoản Admin đang sử dụng!
                </div>
              )}

            <div className="modal-actions">
              <button
                className="scout-btn scout-btn-secondary scout-btn-sm"
                onClick={() => {
                  setSelectedUserForModal(null);
                  setPendingStatus(null);
                  setIsUnlockAction(false);
                }}
              >
                Hủy Bỏ
              </button>

              <button
                className="scout-btn scout-btn-sm"
                style={{ width: 'auto' }}
                disabled={
                  loading ||
                  (!isUnlockAction &&
                    selectedUserForModal.id === user?.id &&
                    pendingStatus !== 'ACTIVE')
                }
                onClick={confirmModalAction}
              >
                {loading ? 'Đang xử lý...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
