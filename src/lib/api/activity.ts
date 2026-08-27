import { apiRequest } from '@/lib/api/transport';
import type { UserActivity, UserActivityResult } from '@/types';

export async function recordUserActivity(signal?: AbortSignal): Promise<UserActivity> {
  return (
    await apiRequest<UserActivityResult>('/v1/users/me/activity', {
      method: 'POST',
      auth: true,
      signal,
    })
  ).activity;
}

export const activityApi = {
  record: recordUserActivity,
};
