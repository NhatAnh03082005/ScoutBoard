import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('should pass in development even if secrets are default', () => {
    const config = {
      NODE_ENV: 'development',
      JWT_SECRET: 'default',
    };
    expect(() => validateEnvironment(config)).not.toThrow();
  });

  it('should pass in test environment without error', () => {
    const config = {
      NODE_ENV: 'test',
    };
    expect(() => validateEnvironment(config)).not.toThrow();
  });

  it('should pass in production with valid strong configuration', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'a_very_strong_production_jwt_secret_key_exceeding_32_chars!',
      JWT_REFRESH_SECRET:
        'a_very_strong_production_jwt_refresh_secret_exceeding_32_chars!',
      POSTGRES_HOST: 'postgres-db',
      POSTGRES_DB: 'scoutboard_db',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'super_secure_unique_db_password_2026',
    };
    expect(() => validateEnvironment(config)).not.toThrow();
  });

  it('should throw if JWT_SECRET is missing in production', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_REFRESH_SECRET:
        'a_very_strong_production_jwt_refresh_secret_exceeding_32_chars!',
      POSTGRES_HOST: 'postgres-db',
      POSTGRES_DB: 'scoutboard_db',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'super_secure_unique_db_password_2026',
    };
    expect(() => validateEnvironment(config)).toThrow(
      'JWT_SECRET is required in production.',
    );
  });

  it('should throw if JWT_SECRET is too short in production', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'short_key',
      JWT_REFRESH_SECRET:
        'a_very_strong_production_jwt_refresh_secret_exceeding_32_chars!',
      POSTGRES_HOST: 'postgres-db',
      POSTGRES_DB: 'scoutboard_db',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'super_secure_unique_db_password_2026',
    };
    expect(() => validateEnvironment(config)).toThrow(
      'JWT_SECRET must be at least 32 characters long',
    );
  });

  it('should throw if JWT_SECRET uses an insecure placeholder in production', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'scoutboard_jwt_access_secret_key_2026_super_secure',
      JWT_REFRESH_SECRET:
        'a_very_strong_production_jwt_refresh_secret_exceeding_32_chars!',
      POSTGRES_HOST: 'postgres-db',
      POSTGRES_DB: 'scoutboard_db',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'super_secure_unique_db_password_2026',
    };
    expect(() => validateEnvironment(config)).toThrow(
      'JWT_SECRET must not use a known insecure placeholder',
    );
  });

  it('should throw if POSTGRES_PASSWORD is default "postgres123" in production', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'a_very_strong_production_jwt_secret_key_exceeding_32_chars!',
      JWT_REFRESH_SECRET:
        'a_very_strong_production_jwt_refresh_secret_exceeding_32_chars!',
      POSTGRES_HOST: 'postgres-db',
      POSTGRES_DB: 'scoutboard_db',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres123',
    };
    expect(() => validateEnvironment(config)).toThrow(
      'POSTGRES_PASSWORD must not use a default/insecure password',
    );
  });
});
