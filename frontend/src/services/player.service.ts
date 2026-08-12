import type { PlayerFilterParams, PlayerListResponse } from '../types/player.types';

// Use Vite environment variable with fallback to local development URL
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

/**
 * Gọi API GET /api/players lấy danh sách cầu thủ có phân trang & bộ lọc
 */
export async function searchPlayersApi(
  params?: PlayerFilterParams,
): Promise<PlayerListResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    if (params.search) queryParams.append('search', params.search);
    if (params.preferredFoot) queryParams.append('preferredFoot', params.preferredFoot);
    if (params.nationality) queryParams.append('nationality', params.nationality);
    if (params.currentTeamId) queryParams.append('currentTeamId', params.currentTeamId);
    if (params.position) queryParams.append('position', params.position);
    if (params.competitionId) queryParams.append('competitionId', params.competitionId);
    if (params.minAge !== undefined && params.minAge !== null && params.minAge !== '') {
      queryParams.append('minAge', String(params.minAge));
    }
    if (params.maxAge !== undefined && params.maxAge !== null && params.maxAge !== '') {
      queryParams.append('maxAge', String(params.maxAge));
    }
    if (params.minHeightCm !== undefined && params.minHeightCm !== null && params.minHeightCm !== '') {
      queryParams.append('minHeightCm', String(params.minHeightCm));
    }
    if (params.maxHeightCm !== undefined && params.maxHeightCm !== null && params.maxHeightCm !== '') {
      queryParams.append('maxHeightCm', String(params.maxHeightCm));
    }
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params.offset !== undefined) queryParams.append('offset', String(params.offset));
  }

  const url = `${API_BASE_URL}/players${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách cầu thủ');
  }

  return data;
}
