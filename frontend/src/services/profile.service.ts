import { API_BASE_URL, authFetch, type UserProfile } from './api';

async function readApiError(response: Response, fallback: string): Promise<Error> {
  const data = await response.json().catch(() => ({}));
  const message = Array.isArray(data.message)
    ? data.message.join(' ')
    : data.message || fallback;
  return new Error(message);
}

export async function updateMyProfileApi(
  accessToken: string,
  fullName: string,
): Promise<UserProfile> {
  const response = await authFetch(
    `${API_BASE_URL}/users/me/profile`,
    { method: 'PATCH', body: JSON.stringify({ fullName }) },
    accessToken,
  );
  if (!response.ok) throw await readApiError(response, 'Unable to update your profile.');
  return response.json();
}

export async function changeMyPasswordApi(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const response = await authFetch(
    `${API_BASE_URL}/users/me/password`,
    {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    accessToken,
  );
  if (!response.ok) throw await readApiError(response, 'Unable to change your password.');
  return response.json();
}

export async function updateMyAvatarApi(
  accessToken: string,
  avatar: File,
): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('avatar', avatar);

  const response = await authFetch(
    `${API_BASE_URL}/users/me/avatar`,
    { method: 'PUT', body: formData },
    accessToken,
  );
  if (!response.ok) throw await readApiError(response, 'Unable to update your avatar.');
  return response.json();
}

export async function removeMyAvatarApi(
  accessToken: string,
): Promise<UserProfile> {
  const response = await authFetch(
    `${API_BASE_URL}/users/me/avatar`,
    { method: 'DELETE' },
    accessToken,
  );
  if (!response.ok) throw await readApiError(response, 'Unable to remove your avatar.');
  return response.json();
}
