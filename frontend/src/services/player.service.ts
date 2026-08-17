import type {
  PlayerFilterParams,
  PlayerMatchFilterParams,
  ComparisonCandidateParams,
  PlayerListResponse,
  PlayerMatchStatisticsResponse,
  PlayerDetail,
  PlayerTeamHistoryItem,
  PlayerSeasonStatisticItem,
} from '../types/player.types';

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

/**
 * Gọi API GET /api/players/:id lấy thông tin chi tiết một cầu thủ
 */
export async function getPlayerByIdApi(playerId: string): Promise<PlayerDetail> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải thông tin chi tiết cầu thủ');
  }

  return data;
}

/**
 * Gọi API GET /api/players/:id/team-history lấy lịch sử thi đấu qua các đội của cầu thủ
 */
export async function getPlayerTeamHistoryApi(
  playerId: string,
): Promise<PlayerTeamHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/team-history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải lịch sử thi đấu của cầu thủ');
  }

  return data;
}

/**
 * Gọi API GET /api/players/:id/season-statistics lấy danh sách thống kê chỉ số theo mùa của cầu thủ
 */
export async function getPlayerSeasonStatisticsApi(
  playerId: string,
): Promise<PlayerSeasonStatisticItem[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/season-statistics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải thống kê mùa giải của cầu thủ');
  }

  return data;
}

/**
 * Gọi API GET /api/players/:id/match-statistics lấy danh sách thống kê từng trận đấu của cầu thủ
 */
export async function getPlayerMatchStatisticsApi(
  playerId: string,
  params?: PlayerMatchFilterParams,
): Promise<PlayerMatchStatisticsResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    if (params.seasonId) queryParams.append('seasonId', params.seasonId);
    if (params.competitionId) queryParams.append('competitionId', params.competitionId);
    if (params.teamId) queryParams.append('teamId', params.teamId);
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params.offset !== undefined) queryParams.append('offset', String(params.offset));
  }

  const url = `${API_BASE_URL}/players/${playerId}/match-statistics${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải thống kê trận đấu của cầu thủ');
  }

  return data;
}

/**
 * Gọi API GET /api/players/:id/comparison-candidates lấy danh sách ứng viên so sánh theo phạm vi bối cảnh
 */
export async function getComparisonCandidatesApi(
  playerId: string,
  params: ComparisonCandidateParams,
): Promise<PlayerListResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append('scope', params.scope);
  queryParams.append('seasonId', params.seasonId);
  if (params.scope === 'COMPETITION' && params.competitionId) {
    queryParams.append('competitionId', params.competitionId);
  }
  if (params.currentTeamId) queryParams.append('currentTeamId', params.currentTeamId);
  if (params.search) queryParams.append('search', params.search);
  if (params.position) queryParams.append('position', params.position);
  if (params.preferredFoot) queryParams.append('preferredFoot', params.preferredFoot);
  if (params.nationality) queryParams.append('nationality', params.nationality);
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

  const url = `${API_BASE_URL}/players/${playerId}/comparison-candidates?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách ứng viên so sánh');
  }

  return data;
}
