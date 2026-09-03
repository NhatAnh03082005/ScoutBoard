const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

// ─── Shared token helpers ────────────────────────────────────────────────────
const getStoredAccessToken = (): string | null =>
  localStorage.getItem('scout_access_token') || localStorage.getItem('accessToken');

const getStoredRefreshToken = (): string | null =>
  localStorage.getItem('scout_refresh_token') || localStorage.getItem('refreshToken');

// ─── Token refresh (declared first — used by authFetch below) ─────────────────
export async function refreshTokenApi(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Làm mới token thất bại');
  return data;
}

/**
 * Authenticated fetch with automatic one-shot token refresh.
 * Mirrors the same pattern in shortlist.service.ts / squad.service.ts.
 * Throws Error('UNAUTHORIZED') when refresh also fails → caller should logout.
 */
async function authFetch(
  url: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  let token = accessToken || getStoredAccessToken();
  if (!token) throw new Error('UNAUTHORIZED');

  const buildHeaders = (tok: string): Headers => {
    const h = new Headers(options.headers || {});
    h.set('Authorization', `Bearer ${tok}`);
    if (!h.has('Content-Type') && options.method && options.method !== 'GET') {
      h.set('Content-Type', 'application/json');
    }
    return h;
  };

  let res = await fetch(url, { ...options, headers: buildHeaders(token) });

  // One-shot refresh on 401
  if (res.status === 401) {
    const refresh = getStoredRefreshToken();
    if (refresh) {
      try {
        const refreshData = await refreshTokenApi(refresh);
        localStorage.setItem('scout_access_token', refreshData.accessToken);
        localStorage.setItem('scout_refresh_token', refreshData.refreshToken);
        res = await fetch(url, { ...options, headers: buildHeaders(refreshData.accessToken) });
      } catch {
        throw new Error('UNAUTHORIZED');
      }
    } else {
      throw new Error('UNAUTHORIZED');
    }
  }

  return res;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  status: string;
  isEmailVerified?: boolean;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
  failedLoginAttempts?: number;
  lockoutCount?: number;
  lockedUntil?: string | null;
  lastFailedLoginAt?: string | null;
  isTemporarilyLocked?: boolean;
  effectiveStatus?: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  userRoles?: {
    role?: {
      code: string;
      name: string;
    };
  }[];
}

export interface AuthResponse {
  message: string;
  user?: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    // Preserve structured error response from backend
    const err = new Error(data.message || 'Đăng nhập thất bại') as any;
    err.code = data.code;
    err.remainingAttempts = data.remainingAttempts;
    err.retryAfterSeconds = data.retryAfterSeconds;
    err.lockedUntil = data.lockedUntil;
    throw err;
  }
  return data;
}

export async function registerApi(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, fullName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đăng ký thất bại');
  }
  return data;
}

export async function getMeApi(accessToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể lấy thông tin tài khoản');
  }
  return data;
}




export async function logoutApi(accessToken: string, refreshToken: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đăng xuất thất bại');
  }
  return data;
}

export async function verifyEmailApi(
  email: string,
  code: string,
): Promise<{ message: string; user?: UserProfile }> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Xác thực email thất bại');
  }
  return data;
}

export async function resendVerificationOtpApi(
  email: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/resend-verification-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gửi lại mã OTP thất bại');
  }
  return data;
}

export async function forgotPasswordApi(
  email: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Yêu cầu đặt lại mật khẩu thất bại');
  }
  return data;
}

export async function resetPasswordApi(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code, newPassword }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
  }
  return data;
}

// --- Admin Management APIs (all use authFetch for auto token refresh) ---

export async function getAdminUsersApi(
  accessToken: string,
  search?: string,
  status?: string,
  role?: string,
): Promise<UserProfile[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (role) params.append('role', role);

  const url = `${API_BASE_URL}/admin/users${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await authFetch(url, { method: 'GET' }, accessToken);
  if (response.status === 401 || !response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể tải danh sách người dùng');
  }
  return response.json();
}

export async function updateUserStatusApi(
  accessToken: string,
  userId: string,
  status: string,
): Promise<UserProfile> {
  const response = await authFetch(
    `${API_BASE_URL}/admin/users/${userId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    accessToken,
  );
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể cập nhật trạng thái người dùng');
  }
  return response.json();
}

export async function unlockUserApi(
  accessToken: string,
  userId: string,
): Promise<UserProfile> {
  const response = await authFetch(
    `${API_BASE_URL}/admin/users/${userId}/unlock`,
    { method: 'PATCH' },
    accessToken,
  );
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể mở khóa tài khoản người dùng');
  }
  return response.json();
}

export async function updateUserRolesApi(
  accessToken: string,
  userId: string,
  roles: string[],
): Promise<UserProfile> {
  const response = await authFetch(
    `${API_BASE_URL}/admin/users/${userId}/roles`,
    { method: 'PATCH', body: JSON.stringify({ roles }) },
    accessToken,
  );
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Không thể cập nhật vai trò người dùng');
  }
  return response.json();
}
