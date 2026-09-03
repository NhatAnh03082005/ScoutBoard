import type {
  TriggerAdminSyncRequest,
  ExecuteAdminSyncResponse,
  ListSyncJobsResponse,
  ListSyncJobsParams,
  SyncJobDetail,
} from '../types/data-sync.types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

/**
 * Trigger an admin data synchronization job
 */
export async function triggerAdminSyncApi(
  accessToken: string,
  payload: TriggerAdminSyncRequest,
): Promise<ExecuteAdminSyncResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/data-sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to trigger data synchronization');
  }

  return data;
}

/**
 * List data synchronization jobs with pagination and filters
 */
export async function listSyncJobsApi(
  accessToken: string,
  params?: ListSyncJobsParams,
): Promise<ListSyncJobsResponse> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.append('limit', String(params.limit));
  if (params?.offset !== undefined) query.append('offset', String(params.offset));
  if (params?.status) query.append('status', params.status);
  if (params?.competitionId) query.append('competitionId', params.competitionId);
  if (params?.seasonId) query.append('seasonId', params.seasonId);

  const url = `${API_BASE_URL}/v1/admin/data-sync/jobs${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load synchronization jobs');
  }

  return data;
}

/**
 * Get synchronization job details and audit logs by ID
 */
export async function getSyncJobByIdApi(
  accessToken: string,
  jobId: string,
): Promise<SyncJobDetail> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/data-sync/${jobId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to load synchronization job details');
  }

  return data;
}
