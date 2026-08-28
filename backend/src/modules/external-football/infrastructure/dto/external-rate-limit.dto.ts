export interface ExternalRateLimitMeta {
  requestsRemaining?: number;
  resetSeconds?: number;
  retryAfterSeconds?: number;
}
