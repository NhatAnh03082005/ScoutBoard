import { useState, useEffect } from 'react';
import {
  loginApi,
  registerApi,
  getMeApi,
  refreshTokenApi,
  logoutApi,
  getAdminUsersApi,
  updateUserStatusApi,
  unlockUserApi,
  updateUserRolesApi,
} from './services/api';
import type { UserProfile } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile' | 'admin'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lockout countdown state
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('scout_access_token'),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('scout_refresh_token'),
  );

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

  // Timer countdown for lock duration
  useEffect(() => {
    if (retryAfterSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRetryAfterSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  // Auto-fetch user profile if token exists on initial load
  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      getMeApi(accessToken)
        .then((profile) => {
          setUser(profile);
          setActiveTab('profile');
          setLoading(false);
        })
        .catch(() => {
          if (refreshToken) {
            refreshTokenApi(refreshToken)
              .then((data) => {
                saveTokens(data.accessToken, data.refreshToken);
                return getMeApi(data.accessToken);
              })
              .then((profile) => {
                setUser(profile);
                setActiveTab('profile');
              })
              .catch(() => {
                clearTokens();
              })
              .finally(() => setLoading(false));
          } else {
            clearTokens();
            setLoading(false);
          }
        });
    }
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

  const saveTokens = (accToken: string, refToken: string) => {
    localStorage.setItem('scout_access_token', accToken);
    localStorage.setItem('scout_refresh_token', refToken);
    setAccessToken(accToken);
    setRefreshToken(refToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('scout_access_token');
    localStorage.removeItem('scout_refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setActiveTab('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setRemainingAttempts(null);
    setLoading(true);

    try {
      const res = await loginApi(email, password);
      saveTokens(res.accessToken, res.refreshToken);
      setSuccess('Đăng nhập thành công!');

      const profile = await getMeApi(res.accessToken);
      setUser(profile);
      setActiveTab('profile');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
      if (err.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
      }
      if (err.retryAfterSeconds) {
        setRetryAfterSeconds(err.retryAfterSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await registerApi(email, password, fullName);
      saveTokens(res.accessToken, res.refreshToken);
      setSuccess('Đăng ký tài khoản thành công!');

      const profile = await getMeApi(res.accessToken);
      setUser(profile);
      setActiveTab('profile');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    if (accessToken && refreshToken) {
      try {
        await logoutApi(accessToken, refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setEmail('');
    setPassword('');
    setFullName('');
    setSuccess('Đã đăng xuất thành công!');
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

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    if (mins <= 0) return `${secs} giây`;
    if (secs === 0) return `${mins} phút`;
    return `${mins} phút ${secs} giây`;
  };

  return (
    <div className={`scout-container ${activeTab === 'admin' ? 'wide' : ''}`}>
      <div className="scout-header">
        <div className="scout-logo-badge">
          ⚽ ScoutBoard Platform
        </div>
        <h1 className="scout-title">
          {activeTab === 'admin'
            ? 'Quản Lý Người Dùng (Admin)'
            : user
            ? 'Trạng Thái Phiên'
            : 'Xác Thực Tài Khoản'}
        </h1>
        <p className="scout-subtitle">
          {activeTab === 'admin'
            ? 'Progressive Lockout & Quản lý vai trò người dùng'
            : user
            ? 'Hệ thống Quản lý Token & Phân quyền RBAC'
            : 'Hệ thống tìm kiếm & Đánh giá Cầu thủ Bóng đá'}
        </p>
      </div>

      {error && <div className="alert-banner alert-error">❌ {error}</div>}
      {success && <div className="alert-banner alert-success">✅ {success}</div>}

      {/* Navigation Tabs Header */}
      {user && (
        <div className="scout-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Cá Nhân
          </button>

          {isAdmin && (
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              👑 Quản Lý Người Dùng
            </button>
          )}
        </div>
      )}

      {/* LOGIN TAB */}
      {!user && activeTab === 'login' && (
        <>
          <div className="scout-tabs">
            <button className="tab-btn active">Đăng Nhập</button>
            <button
              className="tab-btn"
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng Ký
            </button>
          </div>

          <form onSubmit={handleLogin} className="scout-form">
            <div className="input-group">
              <label className="input-label">Địa Chỉ Email</label>
              <input
                type="email"
                className="scout-input"
                placeholder="admin@scoutboard.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Mật Khẩu</label>
              <input
                type="password"
                className="scout-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Lockout Countdown Indicator */}
            {retryAfterSeconds > 0 && (
              <div
                className="alert-banner alert-error"
                style={{ textAlign: 'center', fontWeight: 700 }}
              >
                ⏳ Tài khoản đang bị tạm khóa. Vui lòng thử lại sau:{' '}
                <span style={{ color: '#fde047' }}>
                  {formatSeconds(retryAfterSeconds)}
                </span>
              </div>
            )}

            {/* Remaining Attempts Warning */}
            {remainingAttempts !== null && retryAfterSeconds === 0 && (
              <div
                className="alert-banner alert-error"
                style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.2)', color: '#fde047' }}
              >
                ⚠️ Bạn còn <strong>{remainingAttempts}</strong> lần thử trước khi bị khóa tài khoản tạm thời!
              </div>
            )}

            <button
              type="submit"
              disabled={loading || retryAfterSeconds > 0}
              className="scout-btn"
            >
              {retryAfterSeconds > 0
                ? `Đang bị khóa (${formatSeconds(retryAfterSeconds)})`
                : loading
                ? 'Đang xác thực...'
                : 'Đăng Nhập Ngay ➔'}
            </button>
          </form>
        </>
      )}

      {/* REGISTER TAB */}
      {!user && activeTab === 'register' && (
        <>
          <div className="scout-tabs">
            <button
              className="tab-btn"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng Nhập
            </button>
            <button className="tab-btn active">Đăng Ký</button>
          </div>

          <form onSubmit={handleRegister} className="scout-form">
            <div className="input-group">
              <label className="input-label">Họ và Tên</label>
              <input
                type="text"
                className="scout-input"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Địa Chỉ Email</label>
              <input
                type="email"
                className="scout-input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Mật Khẩu (Tối thiểu 6 ký tự)</label>
              <input
                type="password"
                className="scout-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="scout-btn">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới ➔'}
            </button>
          </form>
        </>
      )}

      {/* USER PROFILE TAB */}
      {user && activeTab === 'profile' && (
        <div className="dashboard-card">
          <div className="user-badge-header">
            <div className="user-avatar">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info-meta">
              <span className="user-info-name">{user.fullName}</span>
              <span className="user-info-email">{user.email}</span>
            </div>
          </div>

          <div className="data-row">
            <span className="data-label">Mã ID User:</span>
            <span className="data-value" style={{ fontSize: '11px' }}>
              {user.id}
            </span>
          </div>

          <div className="data-row">
            <span className="data-label">Trạng Thái:</span>
            <span className="data-value" style={{ color: '#22c55e' }}>
              ● {user.status}
            </span>
          </div>

          <div className="data-row">
            <span className="data-label">Vai Trò (Roles):</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {user.userRoles && user.userRoles.length > 0 ? (
                user.userRoles.map((ur, idx) => (
                  <span
                    key={idx}
                    className={`role-pill ${
                      ur.role?.code === 'ADMIN' ? 'role-pill-admin' : ''
                    }`}
                  >
                    {ur.role?.code || 'USER'}
                  </span>
                ))
              ) : (
                <span className="role-pill">USER</span>
              )}
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="scout-btn scout-btn-danger"
            >
              🚪 Đăng Xuất
            </button>
          </div>
        </div>
      )}

      {/* ADMIN USER MANAGEMENT TAB (Progressive Lockout & RBAC) */}
      {user && activeTab === 'admin' && isAdmin && (
        <div className="dashboard-card">
          {/* Search & Filter Bar */}
          <div className="admin-filter-bar">
            <input
              type="text"
              className="scout-input"
              placeholder="🔍 Tìm kiếm Email hoặc Họ tên..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
            />

            <select
              className="scout-select"
              value={adminStatusFilter}
              onChange={(e) => setAdminStatusFilter(e.target.value)}
            >
              <option value="">Tất cả Trạng Thái</option>
              <option value="ACTIVE">ACTIVE (Hoạt động)</option>
              <option value="DISABLED">DISABLED (Vô hiệu)</option>
              <option value="LOCKED">LOCKED (Tạm khóa)</option>
            </select>

            <select
              className="scout-select"
              value={adminRoleFilter}
              onChange={(e) => setAdminRoleFilter(e.target.value)}
            >
              <option value="">Tất cả Vai Trò</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>

          {/* User List Table */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Họ tên / Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái thực tế</th>
                  <th>Lần nhập sai / Khóa</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.length > 0 ? (
                  adminUsers.map((u) => {
                    const isSelf = u.id === user.id;
                    const isTargetAdmin =
                      u.roles?.includes('ADMIN') ??
                      u.userRoles?.some((ur) => ur.role?.code === 'ADMIN') ??
                      false;
                    const isLocked = u.effectiveStatus === 'LOCKED';

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {u.email} {isSelf && '(Chính bạn)'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {u.userRoles?.map((ur, idx) => (
                              <span
                                key={idx}
                                className={`role-pill ${
                                  ur.role?.code === 'ADMIN'
                                    ? 'role-pill-admin'
                                    : ''
                                }`}
                              >
                                {ur.role?.code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              u.effectiveStatus === 'ACTIVE'
                                ? 'status-active'
                                : u.effectiveStatus === 'DISABLED'
                                ? 'status-disabled'
                                : 'status-locked'
                            }`}
                          >
                            ● {u.effectiveStatus}
                            {u.isTemporarilyLocked && ' (Khóa tạm)'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                          <div>Sai: {u.failedLoginAttempts || 0}/5 lần</div>
                          <div>Đợt khóa: {u.lockoutCount || 0}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              className="scout-select"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              value={u.status === 'LOCKED' ? 'DISABLED' : u.status}
                              onChange={(e) => {
                                setSelectedUserForModal(u);
                                setPendingStatus(e.target.value);
                                setIsUnlockAction(false);
                              }}
                            >
                              <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                              <option value="DISABLED">DISABLED (Vô hiệu)</option>
                            </select>

                            {/* Admin Manual Unlock Button */}
                            {isLocked && (
                              <button
                                onClick={() => {
                                  setSelectedUserForModal(u);
                                  setIsUnlockAction(true);
                                }}
                                className="scout-btn scout-btn-sm"
                                style={{
                                  background: '#22c55e',
                                  color: '#090d16',
                                  padding: '4px 8px',
                                }}
                                title="Mở khóa tài khoản ngay lập tức"
                              >
                                🔓 Mở Khóa
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleAdminRole(u)}
                              disabled={loading || isSelf}
                              className="scout-btn scout-btn-secondary scout-btn-sm"
                              title={
                                isSelf
                                  ? 'Không thể đổi vai trò chính bạn'
                                  : 'Bật/Tắt quyền Admin'
                              }
                            >
                              {isTargetAdmin ? 'Bớt ADMIN' : '+ ADMIN'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Không tìm thấy người dùng nào phù hợp
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
