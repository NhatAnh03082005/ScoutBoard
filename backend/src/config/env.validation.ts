/**
 * Production Environment Validation for ScoutBoard Backend
 *
 * Ensures critical secrets and database configurations are defined and secure
 * when NODE_ENV === 'production'. In development and test environments, relaxed
 * rules apply to preserve developer experience and test suite execution.
 *
 * SENSITIVE VALUES ARE NEVER LOGGED OR PRINTED.
 */

const INSECURE_PLACEHOLDERS = [
  'scoutboard_jwt_access_secret_key_2026_super_secure',
  'scoutboard_jwt_refresh_secret_key_2026_super_secure',
  'replace_with_at_least_64_char_secure_random_key',
  'replace_with_at_least_64_char_secure_random_key_refresh',
  'replace_with_strong_random_secret',
  'replace_with_strong_password_in_production',
  'default',
  'secret',
  'password',
];

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  const errors: string[] = [];

  if (nodeEnv === 'production') {
    // 1. Validate JWT_SECRET
    const jwtSecret = config.JWT_SECRET as string;
    if (
      !jwtSecret ||
      typeof jwtSecret !== 'string' ||
      jwtSecret.trim() === ''
    ) {
      errors.push('JWT_SECRET is required in production.');
    } else if (jwtSecret.length < 32) {
      errors.push(
        'JWT_SECRET must be at least 32 characters long in production.',
      );
    } else if (INSECURE_PLACEHOLDERS.includes(jwtSecret)) {
      errors.push(
        'JWT_SECRET must not use a known insecure placeholder in production.',
      );
    }

    // 2. Validate JWT_REFRESH_SECRET
    const jwtRefreshSecret = config.JWT_REFRESH_SECRET as string;
    if (
      !jwtRefreshSecret ||
      typeof jwtRefreshSecret !== 'string' ||
      jwtRefreshSecret.trim() === ''
    ) {
      errors.push('JWT_REFRESH_SECRET is required in production.');
    } else if (jwtRefreshSecret.length < 32) {
      errors.push(
        'JWT_REFRESH_SECRET must be at least 32 characters long in production.',
      );
    } else if (INSECURE_PLACEHOLDERS.includes(jwtRefreshSecret)) {
      errors.push(
        'JWT_REFRESH_SECRET must not use a known insecure placeholder in production.',
      );
    }

    // 3. Validate Database Configuration
    if (!config.POSTGRES_HOST) {
      errors.push('POSTGRES_HOST is required in production.');
    }
    if (!config.POSTGRES_DB) {
      errors.push('POSTGRES_DB is required in production.');
    }
    if (!config.POSTGRES_USER) {
      errors.push('POSTGRES_USER is required in production.');
    }
    const dbPassword = config.POSTGRES_PASSWORD as string;
    if (
      !dbPassword ||
      typeof dbPassword !== 'string' ||
      dbPassword.trim() === ''
    ) {
      errors.push('POSTGRES_PASSWORD is required in production.');
    } else if (
      dbPassword === 'postgres123' ||
      INSECURE_PLACEHOLDERS.includes(dbPassword)
    ) {
      errors.push(
        'POSTGRES_PASSWORD must not use a default/insecure password in production.',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `\n[FATAL CONFIGURATION ERROR] Environment validation failed in production:\n - ${errors.join(
        '\n - ',
      )}\n`,
    );
  }

  return config;
}
