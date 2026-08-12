const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/api$/, '') ||
  'http://localhost:3000';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  status: string;
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

export async function refreshTokenApi(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Làm mới token thất bại');
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

// --- Admin Management APIs ---

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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách người dùng');
  }
  return data;
}

export async function updateUserStatusApi(
  accessToken: string,
  userId: string,
  status: string,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể cập nhật trạng thái người dùng');
  }
  return data;
}

export async function unlockUserApi(
  accessToken: string,
  userId: string,
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unlock`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể mở khóa tài khoản người dùng');
  }
  return data;
}

export async function updateUserRolesApi(
  accessToken: string,
  userId: string,
  roles: string[],
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/roles`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roles }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể cập nhật vai trò người dùng');
  }
  return data;
}
