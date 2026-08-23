import type {
  Shortlist,
  CreateShortlistRequest,
  UpdateShortlistRequest,
  ShortlistPlayerItem,
} from '../types/shortlist.types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

const getAuthToken = (tokenOverride?: string): string | null => {
  return (
    tokenOverride ||
    localStorage.getItem('scout_access_token') ||
    localStorage.getItem('accessToken')
  );
};

export async function getShortlistsApi(tokenOverride?: string): Promise<Shortlist[]> {
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${shortlistId}/players`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${shortlistId}/players`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ playerId, note }),
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${shortlistId}/players/${playerId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = getAuthToken(tokenOverride);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/shortlists/${shortlistId}/players/${playerId}/note`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to update player note');
  }

  return res.json();
}
