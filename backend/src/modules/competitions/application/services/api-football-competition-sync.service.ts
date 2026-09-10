import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballCompetitionMapper } from '../../../external-football/infrastructure/mappers/api-football-competition.mapper';
import { PersistCompetitionWithSeasonsUseCase } from '../use-cases/persist-competition-with-seasons.use-case';

export interface CompetitionSyncResult {
  competitionId: string;
  externalId: string;
  name: string;
  totalSeasons: number;
  seasonIds: string[];
}

@Injectable()
export class ApiFootballCompetitionSyncService {
  private readonly logger = new Logger(ApiFootballCompetitionSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiClient: ApiFootballClientPort,
    private readonly persistCompWithSeasonsUseCase: PersistCompetitionWithSeasonsUseCase,
  ) {}

  async syncCompetitionById(leagueId: number): Promise<CompetitionSyncResult> {
    this.logger.log(
      `Fetching API-Football competition data for League ID: ${leagueId}`,
    );

    const res = await this.apiClient.getLeagues({ id: leagueId });
    if (!res?.response || res.response.length === 0) {
      throw new NotFoundException(
        `League with ID ${leagueId} not found in API-Football`,
      );
    }

    const item = res.response[0];
    const transformed =
      ApiFootballCompetitionMapper.toTransformedCompetition(item);

    this.logger.log(
      `Persisting competition "${transformed.name}" with ${transformed.seasons.length} seasons...`,
    );

    const persisted =
      await this.persistCompWithSeasonsUseCase.execute(transformed);
    const seasonIds = (persisted.seasons || []).map((s) => s.id);

    this.logger.log(
      `Successfully persisted competition ${persisted.competition.id} (${transformed.name})`,
    );

    return {
      competitionId: persisted.competition.id,
      externalId: transformed.externalId,
      name: transformed.name,
      totalSeasons: seasonIds.length,
      seasonIds,
    };
  }
}
