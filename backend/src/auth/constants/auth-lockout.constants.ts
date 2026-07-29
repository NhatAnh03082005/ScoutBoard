export const LOGIN_LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  observationWindowHours: 24,
  lockDurationsMinutes: [1, 5, 15],
} as const;

export function getLockDurationMinutes(lockoutCount: number): number {
  const durations = LOGIN_LOCKOUT_CONFIG.lockDurationsMinutes;
  const index = Math.min(Math.max(lockoutCount - 1, 0), durations.length - 1);
  return durations[index];
}

export function formatRetryAfter(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} giây`;
  }
  if (seconds === 0) {
    return `${minutes} phút`;
  }
  return `${minutes} phút ${seconds} giây`;
}
