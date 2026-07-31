import {
  ACCOUNT_HAS_NO_ROLES_MESSAGE,
  ACCOUNT_DISABLED_DEFAULT_MESSAGE,
  ACCOUNT_LOCKED_DEFAULT_MESSAGE,
  INVALID_CREDENTIALS_DEFAULT_MESSAGE,
  INVALID_REFRESH_TOKEN_DEFAULT_MESSAGE,
} from './auth-error-messages.constant';

export class InvalidCredentialsError extends Error {
  constructor(message = INVALID_CREDENTIALS_DEFAULT_MESSAGE) {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountDisabledError extends Error {
  constructor(message = ACCOUNT_DISABLED_DEFAULT_MESSAGE) {
    super(message);
    this.name = 'AccountDisabledError';
  }
}

export class AccountLockedError extends Error {
  constructor(message = ACCOUNT_LOCKED_DEFAULT_MESSAGE) {
    super(message);
    this.name = 'AccountLockedError';
  }
}

export class AccountTemporarilyLockedError extends Error {
  constructor(
    public readonly messageText: string,
    public readonly retryAfterSeconds: number,
    public readonly lockedUntil: Date,
  ) {
    super(messageText);
    this.name = 'AccountTemporarilyLockedError';
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor(message = INVALID_REFRESH_TOKEN_DEFAULT_MESSAGE) {
    super(message);
    this.name = 'InvalidRefreshTokenError';
  }
}

export class AccountHasNoRolesError extends Error {
  constructor(message = ACCOUNT_HAS_NO_ROLES_MESSAGE) {
    super(message);
    this.name = 'AccountHasNoRolesError';
  }
}
