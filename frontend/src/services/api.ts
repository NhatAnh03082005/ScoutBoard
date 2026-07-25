const API_BASE_URL = 'http://localhost:3000';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
    throw new Error(data.message || 'Đăng nhập thất bại');
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
