import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiFootballClientPort,
  GetApiFootballLeaguesParams,
  GetApiFootballTeamsParams,
  GetApiFootballFixturesParams,
  GetApiFootballFixturePlayersParams,
  GetApiFootballPlayersParams,
  GetApiFootballSquadParams,
  GetApiFootballTransfersParams,
  GetApiFootballInjuriesParams,
} from '../../application/ports/api-football-client.port';
import {
  ApiFootballPlayerListResponseDto,
  ApiFootballSquadResponseDto,
  ApiFootballTransfersResponseDto,
  ApiFootballInjuriesResponseDto,
} from '../dto/api-football-player.dto';
import { ApiFootballLeagueListResponseDto } from '../dto/api-football-league.dto';
import { ApiFootballTeamListResponseDto } from '../dto/api-football-team.dto';
import { ApiFootballFixtureListResponseDto } from '../dto/api-football-fixture.dto';
import { ApiFootballFixturePlayersListResponseDto } from '../dto/api-football-fixture-player.dto';

export interface ApiFootballClientConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
  initialRetryDelayMs: number;
  rapidApiHost?: string;
}

@Injectable()
export class ApiFootballClient implements ApiFootballClientPort {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly config: ApiFootballClientConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      baseUrl: (
        this.configService.get<string>('API_FOOTBALL_BASE_URL') ||
        'https://v3.football.api-sports.io'
      ).replace(/\/+$/, ''),
      apiKey:
        this.configService.get<string>('API_FOOTBALL_KEY') ||
        this.configService.get<string>('API_FOOTBALL_API_KEY') ||
        '',
      timeoutMs: parseInt(
        this.configService.get<string>('API_FOOTBALL_TIMEOUT') || '20000',
        10,
      ),
      maxRetries: 3,
      initialRetryDelayMs: 1000,
      rapidApiHost: this.configService.get<string>(
        'API_FOOTBALL_RAPIDAPI_HOST',
      ),
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.config.rapidApiHost) {
      headers['x-rapidapi-key'] = this.config.apiKey;
      headers['x-rapidapi-host'] = this.config.rapidApiHost;
    } else {
      headers['x-apisports-key'] = this.config.apiKey;
    }

    return headers;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async request<T>(
    endpoint: string,
    queryParams?: Record<string, any>,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'API-Football API key is not configured. Please set API_FOOTBALL_KEY in .env',
      );
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.config.baseUrl}${cleanEndpoint}`);

    if (queryParams) {
      for (const [key, val] of Object.entries(queryParams)) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          url.searchParams.append(key, String(val));
        }
      }
    }

    const fullUrl = url.toString();
    let attempt = 0;
    let delay = this.config.initialRetryDelayMs;

    while (attempt < this.config.maxRetries) {
      attempt++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        this.logger.debug(
          `[API-Football] GET ${cleanEndpoint}${url.search} (Attempt ${attempt}/${this.config.maxRetries})`,
        );

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timer);
        const duration = Date.now() - startTime;
        const status = response.status;

        // Rate Limit Handling (HTTP 429)
        if (status === 429) {
          this.logger.warn(
            `[API-Football] GET ${cleanEndpoint} returned HTTP 429 Rate Limit (attempt ${attempt}/${this.config.maxRetries}). Retrying in ${delay}ms...`,
          );
          if (attempt >= this.config.maxRetries) {
            throw new HttpException(
              'API-Football Rate Limit Exceeded (429)',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          await this.sleep(delay);
          delay *= 2;
          continue;
        }

        // Server Errors (5xx)
        if (status >= 500 && status < 600) {
          this.logger.warn(
            `[API-Football] GET ${cleanEndpoint} returned HTTP ${status} (attempt ${attempt}/${this.config.maxRetries}). Retrying in ${delay}ms...`,
          );
          if (attempt >= this.config.maxRetries) {
            throw new HttpException(
              `API-Football server error: ${status}`,
              status,
            );
          }
          await this.sleep(delay);
          delay *= 2;
          continue;
        }

        // Client Errors (4xx)
        if (!response.ok) {
          const rawErr = await response.text();
          let parsedMsg = rawErr;
          try {
            const errJson = JSON.parse(rawErr);
            parsedMsg =
              errJson.message ||
              (errJson.errors && JSON.stringify(errJson.errors)) ||
              rawErr;
          } catch {
            // Keep rawErr text
          }
          this.logger.error(
            `[API-Football] GET ${cleanEndpoint} -> HTTP ${status} (${duration}ms): ${parsedMsg}`,
          );
          throw new HttpException(
            `API-Football error ${status}: ${parsedMsg}`,
            status,
          );
        }

        const data = await response.json();
        this.logger.debug(
          `[API-Football] GET ${cleanEndpoint} -> HTTP 200 (${duration}ms) [Results: ${data?.results ?? 0}]`,
        );

        // Check if API-Football returned rate limit or subscription error inside JSON payload
        if (data?.errors) {
          const errors = data.errors;
          if (Array.isArray(errors) && errors.length > 0) {
            this.logger.warn(
              `[API-Football] Response payload contains errors: ${JSON.stringify(errors)}`,
            );
          } else if (
            typeof errors === 'object' &&
            Object.keys(errors).length > 0
          ) {
            const errValues = Object.values(errors).join(', ');
            if (
              errValues.toLowerCase().includes('rate') ||
              errValues.toLowerCase().includes('limit')
            ) {
              this.logger.warn(
                `[API-Football] Rate limit detected in payload: ${errValues}`,
              );
            }
          }
        }

        return data as T;
      } catch (err: any) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          this.logger.warn(
            `[API-Football] GET ${cleanEndpoint} timed out after ${this.config.timeoutMs}ms (attempt ${attempt}/${this.config.maxRetries})`,
          );
        } else if (err instanceof HttpException) {
          if (
            err.getStatus() === HttpStatus.TOO_MANY_REQUESTS ||
            err.getStatus() >= 500
          ) {
            // Handled above in retry loop
          } else {
            throw err;
          }
        } else {
          this.logger.warn(
            `[API-Football] GET ${cleanEndpoint} failed: ${err.message} (attempt ${attempt}/${this.config.maxRetries})`,
          );
        }

        if (attempt >= this.config.maxRetries) {
          throw err instanceof HttpException
            ? err
            : new ServiceUnavailableException(
                `API-Football request failed: ${err.message}`,
              );
        }

        await this.sleep(delay);
        delay *= 2;
      }
    }

    throw new ServiceUnavailableException(
      'API-Football request failed after all retry attempts',
    );
  }

  async getLeagues(
    params: GetApiFootballLeaguesParams,
  ): Promise<ApiFootballLeagueListResponseDto> {
    return this.request<ApiFootballLeagueListResponseDto>('/leagues', params);
  }

  async getTeams(
    params: GetApiFootballTeamsParams,
  ): Promise<ApiFootballTeamListResponseDto> {
    return this.request<ApiFootballTeamListResponseDto>('/teams', params);
  }

  async getFixtures(
    params: GetApiFootballFixturesParams,
  ): Promise<ApiFootballFixtureListResponseDto> {
    return this.request<ApiFootballFixtureListResponseDto>('/fixtures', params);
  }

  async getFixturePlayers(
    params: GetApiFootballFixturePlayersParams,
  ): Promise<ApiFootballFixturePlayersListResponseDto> {
    return this.request<ApiFootballFixturePlayersListResponseDto>(
      '/fixtures/players',
      params,
    );
  }

  async getPlayers(
    params: GetApiFootballPlayersParams,
  ): Promise<ApiFootballPlayerListResponseDto> {
    return this.request<ApiFootballPlayerListResponseDto>('/players', params);
  }

  async getPlayerById(
    id: number,
    season?: number,
  ): Promise<ApiFootballPlayerListResponseDto> {
    return this.getPlayers({ id, season });
  }

  async getSquadByTeam(
    params: GetApiFootballSquadParams,
  ): Promise<ApiFootballSquadResponseDto> {
    return this.request<ApiFootballSquadResponseDto>('/players/squads', params);
  }

  async getTransfers(
    params: GetApiFootballTransfersParams,
  ): Promise<ApiFootballTransfersResponseDto> {
    return this.request<ApiFootballTransfersResponseDto>('/transfers', params);
  }

  async getInjuries(
    params: GetApiFootballInjuriesParams,
  ): Promise<ApiFootballInjuriesResponseDto> {
    return this.request<ApiFootballInjuriesResponseDto>('/injuries', params);
  }
}
