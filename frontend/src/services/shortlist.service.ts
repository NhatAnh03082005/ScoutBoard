import type {
  Shortlist,
  CreateShortlistRequest,
  UpdateShortlistRequest,
  ShortlistPlayerItem,
} from '../types/shortlist.types';
import { refreshTokenApi } from './api';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

const getAuthToken = (tokenOverride?: string): string | null => {
  return (
    tokenOverride ||
    localStorage.getItem('scout_access_token') ||
    localStorage.getItem('accessToken')
  );
};

const getRefreshToken = (): string | null => {
  return (
    localStorage.getItem('scout_refresh_token') ||
    localStorage.getItem('refreshToken')
  );
};

// Helper for authenticated requests with auto-refresh capability
async function authFetch(url: string, options: RequestInit = {}, tokenOverride?: string): Promise<Response> {
  let token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, attempt refresh once
  if (res.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const refreshData = await refreshTokenApi(refresh);
        localStorage.setItem('scout_access_token', refreshData.accessToken);
        localStorage.setItem('scout_refresh_token', refreshData.refreshToken);
        headers.set('Authorization', `Bearer ${refreshData.accessToken}`);
        res = await fetch(url, { ...options, headers });
      } catch {
        throw new Error('UNAUTHORIZED');
      }
    } else {
      throw new Error('UNAUTHORIZED');
    }
  }

  return res;
}

export async function getShortlistsApi(tokenOverride?: string): Promise<Shortlist[]> {
  const res = await authFetch(`${API_BASE_URL}/shortlists`, {}, tokenOverride);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch shortlists');
  }

  return res.json();
}

export async function getShortlistByIdApi(
  id: string,
  tokenOverride?: string,
): Promise<Shortlist> {
  const res = await authFetch(`${API_BASE_URL}/shortlists/${id}`, {}, tokenOverride);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch shortlist');
  }

  return res.json();
}

export async function createShortlistApi(
  data: CreateShortlistRequest,
  tokenOverride?: string,
): Promise<Shortlist> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const resData = await res.json().catch(() => ({}));
    throw new Error(resData.message || 'Failed to create shortlist');
  }

  return res.json();
}

export async function updateShortlistApi(
  id: string,
  data: UpdateShortlistRequest,
  tokenOverride?: string,
): Promise<Shortlist> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const resData = await res.json().catch(() => ({}));
    throw new Error(resData.message || 'Failed to update shortlist');
  }

  return res.json();
}

export async function deleteShortlistApi(
  id: string,
  tokenOverride?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${id}`,
    {
      method: 'DELETE',
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const resData = await res.json().catch(() => ({}));
    throw new Error(resData.message || 'Failed to delete shortlist');
  }

  return res.json();
}

export async function getShortlistPlayersApi(
  shortlistId: string,
  tokenOverride?: string,
): Promise<ShortlistPlayerItem[]> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${shortlistId}/players`,
    {},
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch shortlist players');
  }

  return res.json();
}

export async function addPlayerToShortlistApi(
  shortlistId: string,
  playerId: string,
  note?: string,
  tokenOverride?: string,
): Promise<ShortlistPlayerItem> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${shortlistId}/players`,
    {
      method: 'POST',
      body: JSON.stringify({ playerId, note }),
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to add player to shortlist');
  }

  return res.json();
}

export async function removePlayerFromShortlistApi(
  shortlistId: string,
  playerId: string,
  tokenOverride?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${shortlistId}/players/${playerId}`,
    {
      method: 'DELETE',
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to remove player from shortlist');
  }

  return res.json();
}

export async function updateShortlistPlayerNoteApi(
  shortlistId: string,
  playerId: string,
  note: string | null,
  tokenOverride?: string,
): Promise<ShortlistPlayerItem> {
  const res = await authFetch(
    `${API_BASE_URL}/shortlists/${shortlistId}/players/${playerId}/note`,
    {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to update player note');
  }

  return res.json();
}
