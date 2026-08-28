import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FootballApiClient,
  GetCompetitionsParams,
  GetTeamsParams,
  GetMatchesParams,
  GetPlayersParams,
} from '../../application/ports/football-api-client.port';
import {
  ExternalCompetitionDetailDto,
  ExternalCompetitionListDto,
} from '../dto/external-competition.dto';
import {
  ExternalTeamDetailDto,
  ExternalTeamListDto,
} from '../dto/external-team.dto';
import {
  ExternalPlayerDetailDto,
  ExternalPlayerListDto,
} from '../dto/external-player.dto';
import {
  ExternalMatchDetailDto,
  ExternalMatchListDto,
} from '../dto/external-match.dto';
import { ExternalRateLimitMeta } from '../dto/external-rate-limit.dto';
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
import {
  ExternalFootballConfig,
  getExternalFootballConfig,
} from '../config/external-football.config';

@Injectable()
export class FootballDataOrgClient implements FootballApiClient {
  private readonly logger = new Logger(FootballDataOrgClient.name);
  private readonly config: ExternalFootballConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = getExternalFootballConfig(this.configService);
  }

  async getCompetitions(params?: GetCompetitionsParams): Promise<ExternalCompetitionListDto> {
    const queryParams: Record<string, string | number | undefined> = {
      plan: params?.plan,
      areas: params?.areas,
    };
    const { data, rateLimitMeta } = await this.request<any>('/competitions', queryParams);

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for competitions',
        this.config.provider,
      );
    }

    const competitions = Array.isArray(data.competitions) ? data.competitions : [];
    return {
      count: typeof data.count === 'number' ? data.count : competitions.length,
      competitions,
      rateLimitMeta,
    };
  }

  async getCompetitionById(idOrCode: string | number): Promise<ExternalCompetitionDetailDto> {
    const { data, rateLimitMeta } = await this.request<any>(`/competitions/${encodeURIComponent(String(idOrCode))}`);

    if (!data || typeof data !== 'object' || !data.id) {
      throw new ExternalFootballInvalidResponseError(
        'Invalid competition detail response structure',
        this.config.provider,
      );
    }

    return {
      ...data,
      rateLimitMeta,
    };
  }

  async getTeams(params?: GetTeamsParams): Promise<ExternalTeamListDto> {
    let endpoint = '/teams';
    const queryParams: Record<string, string | number | undefined> = {
      season: params?.season,
      limit: params?.limit,
      offset: params?.offset,
    };

    if (params?.competitionCode) {
      endpoint = `/competitions/${encodeURIComponent(params.competitionCode)}/teams`;
    }

    const { data, rateLimitMeta } = await this.request<any>(endpoint, queryParams);

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for teams',
        this.config.provider,
      );
    }

    const teams = Array.isArray(data.teams) ? data.teams : [];
    return {
      count: typeof data.count === 'number' ? data.count : teams.length,
      teams,
      rateLimitMeta,
    };
  }

  async getTeamById(id: string | number): Promise<ExternalTeamDetailDto> {
    const { data, rateLimitMeta } = await this.request<any>(`/teams/${encodeURIComponent(String(id))}`);

    if (!data || typeof data !== 'object' || !data.id) {
      throw new ExternalFootballInvalidResponseError(
        'Invalid team detail response structure',
        this.config.provider,
      );
    }

    return {
      ...data,
      rateLimitMeta,
    };
  }

  async getMatches(params?: GetMatchesParams): Promise<ExternalMatchListDto> {
    const queryParams: Record<string, string | number | undefined> = {
      competitions: params?.competitions,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      status: params?.status,
      matchday: params?.matchday,
      season: params?.season,
      limit: params?.limit,
      offset: params?.offset,
    };

    const { data, rateLimitMeta } = await this.request<any>('/matches', queryParams);

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for matches',
        this.config.provider,
      );
    }

    const matches = Array.isArray(data.matches) ? data.matches : [];
    return {
      count: typeof data.count === 'number' ? data.count : matches.length,
      matches,
      rateLimitMeta,
    };
  }

  async getMatchById(id: string | number): Promise<ExternalMatchDetailDto> {
    const { data, rateLimitMeta } = await this.request<any>(`/matches/${encodeURIComponent(String(id))}`);

    if (!data || typeof data !== 'object' || !data.id) {
      throw new ExternalFootballInvalidResponseError(
        'Invalid match detail response structure',
        this.config.provider,
      );
    }

    return {
      ...data,
      rateLimitMeta,
    };
  }

  async getPlayers(params?: GetPlayersParams): Promise<ExternalPlayerListDto> {
    const queryParams: Record<string, string | number | undefined> = {
      limit: params?.limit,
      offset: params?.offset,
    };

    let endpoint = '/persons';
    if (params?.teamId) {
      endpoint = `/teams/${encodeURIComponent(String(params.teamId))}`;
      const { data, rateLimitMeta } = await this.request<any>(endpoint);
      const players = Array.isArray(data?.squad) ? data.squad : [];
      return {
        count: players.length,
        players,
        rateLimitMeta,
      };
    }

    const { data, rateLimitMeta } = await this.request<any>(endpoint, queryParams);

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for players',
        this.config.provider,
      );
    }

    const players = Array.isArray(data.persons || data.players)
      ? data.persons || data.players
      : [];

    return {
      count: typeof data.count === 'number' ? data.count : players.length,
      players,
      rateLimitMeta,
    };
  }

  async getPlayerById(id: string | number): Promise<ExternalPlayerDetailDto> {
    const { data, rateLimitMeta } = await this.request<any>(`/persons/${encodeURIComponent(String(id))}`);

    if (!data || typeof data !== 'object' || !data.id) {
      throw new ExternalFootballInvalidResponseError(
        'Invalid player detail response structure',
        this.config.provider,
      );
    }

    return {
      ...data,
      rateLimitMeta,
    };
  }

  async getPlayerMatches(
    id: string | number,
    params?: GetMatchesParams,
  ): Promise<ExternalMatchListDto> {
    const queryParams: Record<string, string | number | undefined> = {
      competitions: params?.competitions,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      status: params?.status,
      limit: params?.limit,
      offset: params?.offset,
    };

    const { data, rateLimitMeta } = await this.request<any>(
      `/persons/${encodeURIComponent(String(id))}/matches`,
      queryParams,
    );

    if (!data || typeof data !== 'object') {
      throw new ExternalFootballInvalidResponseError(
        'Expected an object response for player matches',
        this.config.provider,
      );
    }

    const matches = Array.isArray(data.matches) ? data.matches : [];
    return {
      count: typeof data.count === 'number' ? data.count : matches.length,
      matches,
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

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-Auth-Token'] = this.config.apiKey;
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
        'Failed to parse JSON response from external football API',
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
      headers.get('x-requests-available-minute') ||
      headers.get('x-ratelimit-remaining');
    const resetHeader =
      headers.get('x-requestcounter-reset') ||
      headers.get('x-ratelimit-reset');
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
      // Body may not be JSON on certain 5xx/4xx errors
    }

    const errorDetail = errorBodyMessage ? `: ${errorBodyMessage}` : '';

    switch (response.status) {
      case 400:
        throw new ExternalFootballBadRequestError(
          `External API Bad Request (400)${errorDetail}`,
          this.config.provider,
        );
      case 401:
        throw new ExternalFootballUnauthorizedError(
          `External API Unauthorized (401)${errorDetail}`,
          this.config.provider,
        );
      case 403:
        throw new ExternalFootballForbiddenError(
          `External API Forbidden (403)${errorDetail}`,
          this.config.provider,
        );
      case 404:
        throw new ExternalFootballNotFoundError(
          `External API Resource Not Found (404)${errorDetail}`,
          this.config.provider,
        );
      case 429:
        throw new ExternalFootballRateLimitError(
          `External API Rate Limit Exceeded (429)${errorDetail}`,
          this.config.provider,
          rateLimitMeta?.retryAfterSeconds,
          rateLimitMeta?.requestsRemaining,
          rateLimitMeta?.resetSeconds,
        );
      default:
        if (response.status >= 500) {
          throw new ExternalFootballServerError(
            response.status,
            `External API Server Error (${response.status})${errorDetail}`,
            this.config.provider,
          );
        }
        throw new ExternalFootballBadRequestError(
          `External API Error (${response.status})${errorDetail}`,
          this.config.provider,
        );
    }
  }
}
