import type { CompetitionItem, CompetitionTeamItem } from '../types/competition.types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

/**
 * Lấy danh sách tất cả các giải đấu
 */
export async function getCompetitionsApi(): Promise<CompetitionItem[]> {
  const response = await fetch(`${API_BASE_URL}/competitions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách giải đấu');
  }

  return data;
}

/**
 * Lấy danh sách đội bóng thuộc mùa giải hiện tại của một giải đấu
 */
export async function getCurrentTeamsByCompetitionApi(
  competitionId: string,
): Promise<CompetitionTeamItem[]> {
  const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/teams`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách đội bóng');
  }

  return data;
}
