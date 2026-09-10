import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballTeamMapper } from '../../../external-football/infrastructure/mappers/api-football-team.mapper';
import { PersistTeamUseCase } from '../use-cases/persist-team.use-case';
import { PersistSeasonTeamsUseCase } from '../../../seasons/application/use-cases/persist-season-teams.use-case';

export interface TeamSyncResultItem {
  externalId: string;
  teamId: string;
  teamName: string;
}

export interface TeamSyncSummary {
  totalRequested: number;
  successful: number;
  failed: number;
  results: TeamSyncResultItem[];
  errors: { externalId: string; teamName?: string; error: string }[];
}

@Injectable()
export class ApiFootballTeamSyncService {
  private readonly logger = new Logger(ApiFootballTeamSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiClient: ApiFootballClientPort,
    private readonly persistTeamUseCase: PersistTeamUseCase,
    private readonly persistSeasonTeamsUseCase: PersistSeasonTeamsUseCase,
  ) {}

  async syncTeamsByCompetition(
    competitionExternalId: string | number,
    seasonYear: string | number,
    seasonInternalId: string,
  ): Promise<TeamSyncSummary> {
    const leagueId = parseInt(String(competitionExternalId), 10);
    const season = parseInt(String(seasonYear), 10);

    if (isNaN(leagueId) || isNaN(season)) {
      throw new BadRequestException(
        `Invalid competitionExternalId (${competitionExternalId}) or seasonYear (${seasonYear})`,
      );
    }

    this.logger.log(
      `Fetching teams for League ${leagueId}, Season ${season} from API-Football...`,
    );

    const res = await this.apiClient.getTeams({ league: leagueId, season });
    const teamItems = res?.response || [];

    this.logger.log(`Received ${teamItems.length} teams from API-Football`);

    const results: TeamSyncResultItem[] = [];
    const errors: { externalId: string; teamName?: string; error: string }[] =
      [];
    const persistedTeamIds: string[] = [];

    for (const item of teamItems) {
      const extId = String(item.team?.id);
      const teamName = item.team?.name || 'Unknown';

      try {
        const transformed = ApiFootballTeamMapper.toTransformedTeam(item);
        const persistResult =
          await this.persistTeamUseCase.execute(transformed);

        results.push({
          externalId: extId,
          teamId: persistResult.id,
          teamName: transformed.name,
        });
        persistedTeamIds.push(persistResult.id);
      } catch (err: any) {
        this.logger.error(
          `Failed to persist team ${teamName} (${extId}): ${err.message}`,
        );
        errors.push({
          externalId: extId,
          teamName,
          error: err.message,
        });
      }
    }

    // Link persisted teams to season_teams
    if (persistedTeamIds.length > 0 && seasonInternalId) {
      try {
        this.logger.log(
          `Linking ${persistedTeamIds.length} teams to season ${seasonInternalId}...`,
        );
        await this.persistSeasonTeamsUseCase.execute({
          seasonId: seasonInternalId,
          teamIds: persistedTeamIds,
        });
        this.logger.log(
          `Successfully linked ${persistedTeamIds.length} season_teams for season ${seasonInternalId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to link season_teams for season ${seasonInternalId}: ${err.message}`,
        );
      }
    }

    return {
      totalRequested: teamItems.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
