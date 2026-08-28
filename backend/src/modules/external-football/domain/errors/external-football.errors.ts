export abstract class ExternalFootballApiError extends Error {
  constructor(
    message: string,
    public readonly provider: string = 'football-data.org',
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExternalFootballBadRequestError extends ExternalFootballApiError {
  constructor(
    message: string = 'Bad request sent to external football API',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, 400, originalError);
  }
}

export class ExternalFootballUnauthorizedError extends ExternalFootballApiError {
  constructor(
    message: string = 'Unauthorized: Invalid or missing API authentication token',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, 401, originalError);
  }
}

export class ExternalFootballForbiddenError extends ExternalFootballApiError {
  constructor(
    message: string = 'Forbidden: Access denied to the requested external football resource',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, 403, originalError);
  }
}

export class ExternalFootballNotFoundError extends ExternalFootballApiError {
  constructor(
    message: string = 'The requested external football resource was not found',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, 404, originalError);
  }
}

export class ExternalFootballRateLimitError extends ExternalFootballApiError {
  constructor(
    message: string = 'Rate limit exceeded for external football API',
    provider: string = 'football-data.org',
    public readonly retryAfterSeconds?: number,
    public readonly requestsRemaining?: number,
    public readonly resetSeconds?: number,
    originalError?: unknown,
  ) {
    super(message, provider, 429, originalError);
  }
}

export class ExternalFootballServerError extends ExternalFootballApiError {
  constructor(
    statusCode: number = 500,
    message: string = `External football API server error (${statusCode})`,
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, statusCode, originalError);
  }
}

export class ExternalFootballTimeoutError extends ExternalFootballApiError {
  constructor(
    public readonly timeoutMs: number,
    message: string = `External football API request timed out after ${timeoutMs}ms`,
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, undefined, originalError);
  }
}

export class ExternalFootballNetworkError extends ExternalFootballApiError {
  constructor(
    message: string = 'Network error occurred while connecting to external football API',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, undefined, originalError);
  }
}

export class ExternalFootballInvalidResponseError extends ExternalFootballApiError {
  constructor(
    message: string = 'Invalid or unexpected response format received from external football API',
    provider: string = 'football-data.org',
    originalError?: unknown,
  ) {
    super(message, provider, undefined, originalError);
  }
}
