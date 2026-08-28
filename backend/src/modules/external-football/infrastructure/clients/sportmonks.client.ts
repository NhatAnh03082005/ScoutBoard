import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SportmonksApiClient } from '../../application/ports/sportmonks-api-client.port';
import {
  SportmonksFixtureDto,
  SportmonksFixtureListDto,
  SportmonksFixtureResponseDto,
} from '../dto/sportmonks-fixture.dto';
import { ExternalRateLimitMeta } from '../dto/external-rate-limit.dto';
import {
  SportmonksConfig,
  getSportmonksConfig,
} from '../config/sportmonks.config';
import {
  ExternalFootballBadRequestError,
  ExternalFootballUnauthorizedError,
  ExternalFootballForbiddenError,
  ExternalFootballNotFoundError,
  ExternalFootballRateLimitError,
  ExternalFootballServerError,
  ExternalFootballTimeoutError,
  ExternalFootballNetworkError,
  ExternalFootballInvalidResponseError,
} from '../../domain/errors/external-football.errors';

@Injectable()
export class SportmonksClient implements SportmonksApiClient {
  private readonly logger = new Logger(SportmonksClient.name);
  private readonly config: SportmonksConfig;

  public static readonly DEFAULT_FIXTURE_INCLUDES = [
    'lineups.details',
    'events',
    'scores',
    'participants',
    'statistics',
  ];

  constructor(private readonly configService: ConfigService) {
    this.config = getSportmonksConfig(this.configService);
  }

  async getFixtureById(
    id: number | string,
    includes?: string[],
  ): Promise<SportmonksFixtureDto> {
    const inc = includes && includes.length > 0 ? includes.join(';') : SportmonksClient.DEFAULT_FIXTURE_INCLUDES.join(';');
    const { data, rateLimitMeta } = await this.request<SportmonksFixtureResponseDto>(
      `/fixtures/${encodeURIComponent(String(id))}`,
      { include: inc },
    );

    if (!data || typeof data !== 'object' || !data.data || !data.data.id) {
      throw new ExternalFootballInvalidResponseError(
        'Invalid Sportmonks fixture detail response structure',
        this.config.provider,
      );
    }

    return {
      ...data.data,
      rateLimitMeta,
    };
  }

  async getFixturesByDate(
    date: string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto> {
    const inc = includes && includes.length > 0 ? includes.join(';') : SportmonksClient.DEFAULT_FIXTURE_INCLUDES.join(';');
    const { data, rateLimitMeta } = await this.request<any>(
      `/fixtures/date/${encodeURIComponent(date)}`,
      { include: inc },
    );

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for Sportmonks fixtures by date',
        this.config.provider,
      );
    }

    const fixtures = Array.isArray(data.data) ? data.data : [];
    return {
      data: fixtures,
      pagination: data.pagination,
      rateLimitMeta,
    };
  }

  async getFixturesByDateRange(
    startDate: string,
    endDate: string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto> {
    const inc = includes && includes.length > 0 ? includes.join(';') : SportmonksClient.DEFAULT_FIXTURE_INCLUDES.join(';');
    const { data, rateLimitMeta } = await this.request<any>(
      `/fixtures/between/${encodeURIComponent(startDate)}/${encodeURIComponent(endDate)}`,
      { include: inc },
    );

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for Sportmonks fixtures between dates',
        this.config.provider,
      );
    }

    const fixtures = Array.isArray(data.data) ? data.data : [];
    return {
      data: fixtures,
      pagination: data.pagination,
      rateLimitMeta,
    };
  }

  async getFixturesBySeason(
    seasonId: number | string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto> {
    const inc = includes && includes.length > 0 ? includes.join(';') : SportmonksClient.DEFAULT_FIXTURE_INCLUDES.join(';');
    const { data, rateLimitMeta } = await this.request<any>(
      `/fixtures/seasons/${encodeURIComponent(String(seasonId))}`,
      { include: inc },
    );

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for Sportmonks fixtures by season',
        this.config.provider,
      );
    }

    const fixtures = Array.isArray(data.data) ? data.data : [];
    return {
      data: fixtures,
      pagination: data.pagination,
      rateLimitMeta,
    };
  }

  /**
   * Internal resilient HTTP request executor
   */
  private async request<T>(
    endpointPath: string,
    queryParams?: Record<string, string | number | undefined>,
  ): Promise<{ data: T; rateLimitMeta?: ExternalRateLimitMeta }> {
    const url = new URL(`${this.config.baseUrl}${endpointPath}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    if (this.config.apiKey) {
      url.searchParams.append('api_token', this.config.apiKey);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = this.config.apiKey;
    }

    const startTime = Date.now();
    const cleanEndpoint = endpointPath;

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        this.logger.error(
          `[${this.config.provider}] GET ${cleanEndpoint} TIMEOUT after ${durationMs}ms`,
        );
        throw new ExternalFootballTimeoutError(this.config.timeoutMs, undefined, this.config.provider, error);
      }

      this.logger.error(
        `[${this.config.provider}] GET ${cleanEndpoint} NETWORK ERROR after ${durationMs}ms: ${error?.message || error}`,
      );
      throw new ExternalFootballNetworkError(
        `Network connection failed: ${error?.message || 'Unknown network error'}`,
        this.config.provider,
        error,
      );
    }

    const durationMs = Date.now() - startTime;
    const rateLimitMeta = this.extractRateLimitMeta(response.headers);

    this.logger.log(
      `[${this.config.provider}] GET ${cleanEndpoint} -> HTTP ${response.status} (${durationMs}ms)`,
    );

    if (!response.ok) {
      await this.handleHttpError(response, rateLimitMeta);
    }

    let parsedJson: T;
    try {
      parsedJson = await response.json();
    } catch (err: any) {
      this.logger.error(
        `[${this.config.provider}] GET ${cleanEndpoint} FAILED TO PARSE JSON: ${err?.message || err}`,
      );
      throw new ExternalFootballInvalidResponseError(
        'Failed to parse JSON response from Sportmonks API',
        this.config.provider,
        err,
      );
    }

    return {
      data: parsedJson,
      rateLimitMeta,
    };
  }

  private extractRateLimitMeta(headers: Headers): ExternalRateLimitMeta {
    const remainingHeader =
      headers.get('x-ratelimit-remaining') ||
      headers.get('x-requests-available-minute');
    const resetHeader =
      headers.get('x-ratelimit-reset') ||
      headers.get('x-requestcounter-reset');
    const retryAfterHeader = headers.get('retry-after');

    const requestsRemaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;
    const resetSeconds = resetHeader ? parseInt(resetHeader, 10) : undefined;
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

    return {
      requestsRemaining: !isNaN(requestsRemaining as number) ? requestsRemaining : undefined,
      resetSeconds: !isNaN(resetSeconds as number) ? resetSeconds : undefined,
      retryAfterSeconds: !isNaN(retryAfterSeconds as number) ? retryAfterSeconds : undefined,
    };
  }

  private async handleHttpError(response: Response, rateLimitMeta?: ExternalRateLimitMeta): Promise<never> {
    let errorBodyMessage = '';
    try {
      const errorJson = await response.json();
      errorBodyMessage = errorJson?.message || errorJson?.error || JSON.stringify(errorJson);
    } catch {
      // Body may not be JSON on 5xx errors
    }

    const errorDetail = errorBodyMessage ? `: ${errorBodyMessage}` : '';

    switch (response.status) {
      case 400:
        throw new ExternalFootballBadRequestError(
          `Sportmonks API Bad Request (400)${errorDetail}`,
          this.config.provider,
        );
      case 401:
        throw new ExternalFootballUnauthorizedError(
          `Sportmonks API Unauthorized (401)${errorDetail}`,
          this.config.provider,
        );
      case 403:
        throw new ExternalFootballForbiddenError(
          `Sportmonks API Forbidden (403)${errorDetail}`,
          this.config.provider,
        );
      case 404:
        throw new ExternalFootballNotFoundError(
          `Sportmonks API Resource Not Found (404)${errorDetail}`,
          this.config.provider,
        );
      case 429:
        throw new ExternalFootballRateLimitError(
          `Sportmonks API Rate Limit Exceeded (429)${errorDetail}`,
          this.config.provider,
          rateLimitMeta?.retryAfterSeconds,
          rateLimitMeta?.requestsRemaining,
          rateLimitMeta?.resetSeconds,
        );
      default:
        if (response.status >= 500) {
          throw new ExternalFootballServerError(
            response.status,
            `Sportmonks API Server Error (${response.status})${errorDetail}`,
            this.config.provider,
          );
        }
        throw new ExternalFootballBadRequestError(
          `Sportmonks API Error (${response.status})${errorDetail}`,
          this.config.provider,
        );
    }
  }
}
