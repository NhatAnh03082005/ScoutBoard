import type { CompetitionItem, CompetitionTeamItem } from '../types/competition.types';
import type { SeasonItem, MatchItem } from '../types/data-sync.types';

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
 * Lấy danh sách mùa giải của một giải đấu
 */
export async function getSeasonsByCompetitionApi(
  competitionId: string,
): Promise<SeasonItem[]> {
  const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/seasons`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách mùa giải');
  }

  return data;
}

/**
 * Lấy danh sách trận đấu theo giải và mùa giải
 */
export async function getMatchesByCompetitionAndSeasonApi(
  competitionId: string,
  seasonId: string,
): Promise<MatchItem[]> {
  const params = new URLSearchParams({ competitionId, seasonId });
  const response = await fetch(`${API_BASE_URL}/matches?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải danh sách trận đấu');
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
