import type {
  Squad,
  CreateSquadRequest,
  UpdateSquadRequest,
  SquadPlayerItem,
  SquadPlayerRole,
} from '../types/squad.types';
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

export async function getSquadsApi(tokenOverride?: string): Promise<Squad[]> {
  const res = await authFetch(`${API_BASE_URL}/squads`, {}, tokenOverride);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch squads');
  }

  return res.json();
}

export async function getSquadByIdApi(
  id: string,
  tokenOverride?: string,
): Promise<Squad> {
  const res = await authFetch(`${API_BASE_URL}/squads/${id}`, {}, tokenOverride);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch squad');
  }

  return res.json();
}

export async function createSquadApi(
  data: CreateSquadRequest,
  tokenOverride?: string,
): Promise<Squad> {
  const res = await authFetch(
    `${API_BASE_URL}/squads`,
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
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(errData.message)
        ? errData.message.join(', ')
        : errData.message || 'Failed to create squad',
    );
  }

  return res.json();
}

export async function updateSquadApi(
  id: string,
  data: UpdateSquadRequest,
  tokenOverride?: string,
): Promise<Squad> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${id}`,
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
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(errData.message)
        ? errData.message.join(', ')
        : errData.message || 'Failed to update squad',
    );
  }

  return res.json();
}

export async function deleteSquadApi(
  id: string,
  tokenOverride?: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${id}`,
    {
      method: 'DELETE',
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete squad');
  }
}

export async function getPlayersInSquadApi(
  squadId: string,
  tokenOverride?: string,
): Promise<SquadPlayerItem[]> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${squadId}/players`,
    {},
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch squad players');
  }

  return res.json();
}

export async function addPlayerToSquadApi(
  squadId: string,
  data: {
    playerId: string;
    slotCode?: string | null;
    role: SquadPlayerRole;
    isCaptain?: boolean;
    displayOrder?: number | null;
  },
  tokenOverride?: string,
): Promise<SquadPlayerItem> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${squadId}/players`,
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
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(errData.message)
        ? errData.message.join(', ')
        : errData.message || 'Failed to add player to squad',
    );
  }

  return res.json();
}

export async function updateSquadPlayerApi(
  squadId: string,
  playerId: string,
  data: {
    slotCode?: string | null;
    role?: SquadPlayerRole;
    isCaptain?: boolean;
    displayOrder?: number | null;
  },
  tokenOverride?: string,
): Promise<SquadPlayerItem> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${squadId}/players/${playerId}`,
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
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(errData.message)
        ? errData.message.join(', ')
        : errData.message || 'Failed to update squad player',
    );
  }

  return res.json();
}

export async function removePlayerFromSquadApi(
  squadId: string,
  playerId: string,
  tokenOverride?: string,
): Promise<void> {
  const res = await authFetch(
    `${API_BASE_URL}/squads/${squadId}/players/${playerId}`,
    {
      method: 'DELETE',
    },
    tokenOverride,
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to remove player from squad');
  }
}
