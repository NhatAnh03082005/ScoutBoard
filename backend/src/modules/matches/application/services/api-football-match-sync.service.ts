import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballMatchMapper } from '../../../external-football/infrastructure/mappers/api-football-match.mapper';
import { PersistMatchUseCase } from '../use-cases/persist-match.use-case';

export interface MatchSyncResultItem {
  matchId: string;
  externalId: string;
  matchDate: Date | null;
  status: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
}

export interface MatchSyncSummary {
  totalRequested: number;
  successful: number;
  failed: number;
  results: MatchSyncResultItem[];
  errors: { externalId: string; error: string }[];
}

@Injectable()
export class ApiFootballMatchSyncService {
  private readonly logger = new Logger(ApiFootballMatchSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiClient: ApiFootballClientPort,
    private readonly persistMatchUseCase: PersistMatchUseCase,
  ) {}

  async syncMatchesByCompetition(
    competitionInternalId: string,
    seasonInternalId: string,
    competitionExternalId: string | number,
    seasonYear: string | number,
    round?: string,
  ): Promise<MatchSyncSummary> {
    const leagueId = parseInt(String(competitionExternalId), 10);
    const season = parseInt(String(seasonYear), 10);

    if (isNaN(leagueId) || isNaN(season)) {
      throw new BadRequestException(
        `Invalid competitionExternalId (${competitionExternalId}) or seasonYear (${seasonYear})`,
      );
    }

    this.logger.log(
      `Fetching fixtures for League ${leagueId}, Season ${season}${round ? `, Round "${round}"` : ''} from API-Football...`,
    );

    const res = await this.apiClient.getFixtures({
      league: leagueId,
      season,
      round: round || undefined,
    });

    const fixtures = res?.response || [];
    this.logger.log(`Received ${fixtures.length} fixtures from API-Football`);

    const results: MatchSyncResultItem[] = [];
    const errors: { externalId: string; error: string }[] = [];

    for (const f of fixtures) {
      const extId = String(f.fixture?.id);
      try {
        const transformed = ApiFootballMatchMapper.toTransformedMatch(f);
        const persisted = await this.persistMatchUseCase.execute(transformed, {
          competitionId: competitionInternalId,
          seasonId: seasonInternalId,
        });

        results.push({
          matchId: persisted.id,
          externalId: extId,
          matchDate: persisted.matchDate,
          status: persisted.status,
          homeTeamExternalId: transformed.homeTeamExternalId,
          awayTeamExternalId: transformed.awayTeamExternalId,
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to sync fixture ${extId}: ${err.message}`,
        );
        errors.push({
          externalId: extId,
          error: err.message,
        });
      }
    }

    return {
      totalRequested: fixtures.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
