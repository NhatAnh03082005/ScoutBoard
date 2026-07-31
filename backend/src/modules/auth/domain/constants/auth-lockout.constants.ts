export const LOGIN_LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  observationWindowHours: 24,
  lockoutDurationsMinutes: {
    1: 1,
    2: 5,
    3: 15,
  } as Record<number, number>,
};

export function getLockDurationMinutes(lockoutCount: number): number {
  return LOGIN_LOCKOUT_CONFIG.lockoutDurationsMinutes[lockoutCount] || 15;
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} giây`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} phút`;
}
