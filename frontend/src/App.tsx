import { useState, useEffect } from 'react';
import {
  loginApi,
  registerApi,
  getMeApi,
  refreshTokenApi,
  logoutApi,
} from './services/api';
import type { UserProfile } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('scout_access_token'),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('scout_refresh_token'),
  );

  // Auto-fetch user profile if token exists on initial load
  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      getMeApi(accessToken)
        .then((profile) => {
          setUser(profile);
          setLoading(false);
        })
        .catch(() => {
          // Token expired or invalid, attempt refresh if refresh_token exists
          if (refreshToken) {
            refreshTokenApi(refreshToken)
              .then((data) => {
                saveTokens(data.accessToken, data.refreshToken);
                return getMeApi(data.accessToken);
              })
              .then((profile) => {
                setUser(profile);
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginApi(email, password);
      saveTokens(res.accessToken, res.refreshToken);
      setSuccess('Đăng nhập thành công!');
      
      const profile = await getMeApi(res.accessToken);
      setUser(profile);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
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
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!refreshToken) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await refreshTokenApi(refreshToken);
      saveTokens(data.accessToken, data.refreshToken);
      setSuccess('Làm mới Token thành công (Token Rotation)!');
    } catch (err: any) {
      setError(err.message || 'Làm mới Token thất bại');
      clearTokens();
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
        // Ignore logout network errors and clear state
      }
    }
    clearTokens();
    setEmail('');
    setPassword('');
    setFullName('');
    setSuccess('Đã đăng xuất thành công!');
    setLoading(false);
  };

  return (
    <div className="scout-container">
      <div className="scout-header">
        <div className="scout-logo-badge">
          ⚽ ScoutBoard Auth
        </div>
        <h1 className="scout-title">
          {user ? 'Trạng Thái Phiên' : 'Xác Thực Tài Khoản'}
        </h1>
        <p className="scout-subtitle">
          {user
            ? 'Quản lý Access Token & Refresh Token'
            : 'Hệ thống tìm kiếm & Đánh giá Cầu thủ Bóng đá'}
        </p>
      </div>

      {error && <div className="alert-banner alert-error">❌ {error}</div>}
      {success && <div className="alert-banner alert-success">✅ {success}</div>}

      {user ? (
        /* Logged In Dashboard View */
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
                  <span key={idx} className="role-pill">
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
              onClick={handleRefreshToken}
              disabled={loading}
              className="scout-btn scout-btn-secondary"
            >
              🔄 Refresh Token
            </button>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="scout-btn scout-btn-danger"
            >
              🚪 Đăng Xuất
            </button>
          </div>
        </div>
      ) : (
        /* Login / Register Tab Form View */
        <>
          <div className="scout-tabs">
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng Nhập
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccess(null);
              }}
            >
              Đăng Ký
            </button>
          </div>

          {activeTab === 'login' ? (
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

              <button type="submit" disabled={loading} className="scout-btn">
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay ➔'}
              </button>
            </form>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}

export default App;
