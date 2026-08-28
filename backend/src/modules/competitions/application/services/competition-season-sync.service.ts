import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataCompetitionMapper } from '../../../external-football/infrastructure/mappers/football-data-competition.mapper';
import {
  PersistCompetitionWithSeasonsUseCase,
  PersistCompetitionWithSeasonsResult,
} from '../use-cases/persist-competition-with-seasons.use-case';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

export interface SyncCompetitionResult {
  externalId: string;
  competitionId: string;
  competitionName: string;
  seasonsPersisted: number;
  persistedCompetition: CompetitionOrmEntity;
  persistedSeasons: SeasonOrmEntity[];
}

export interface SyncCompetitionsBatchResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: SyncCompetitionResult[];
  errors: Array<{ externalId: string; error: string }>;
}

@Injectable()
export class CompetitionSeasonSyncService {
  private readonly logger = new Logger(CompetitionSeasonSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistCompetitionWithSeasonsUseCase: PersistCompetitionWithSeasonsUseCase,
  ) {}

  /**
   * Syncs a single competition and its seasons from external API to PostgreSQL
   * @param idOrCode e.g. "PL" or 2021
   */
  async syncCompetitionById(
    idOrCode: string | number,
  ): Promise<SyncCompetitionResult> {
    if (idOrCode === null || idOrCode === undefined || String(idOrCode).trim() === '') {
      throw new BadRequestException('Competition ID or code is required for sync');
    }

    this.logger.log(`[Sync] Extracting competition data for identifier: ${idOrCode}`);

    // 1. EXTRACT: Call external Football API client
    const rawDetail = await this.footballApiClient.getCompetitionById(idOrCode);

    // 2. TRANSFORM: Map raw DTO to clean internal domain model
    const transformed = FootballDataCompetitionMapper.toTransformedCompetition(rawDetail);

    // 3. LOAD: Persist competition and associated seasons into PostgreSQL
    const persistResult: PersistCompetitionWithSeasonsResult =
      await this.persistCompetitionWithSeasonsUseCase.execute(transformed);

    this.logger.log(
      `[Sync] Successfully synced competition "${transformed.name}" (ID: ${persistResult.competitionId}) with ${persistResult.seasonsPersisted} seasons`,
    );

    return {
      externalId: transformed.externalId,
      competitionId: persistResult.competitionId,
      competitionName: persistResult.competition.name,
      seasonsPersisted: persistResult.seasonsPersisted,
      persistedCompetition: persistResult.competition,
      persistedSeasons: persistResult.seasons,
    };
  }

  /**
   * Syncs multiple competitions (e.g. tier 1 leagues) in batch
   */
  async syncCompetitions(params?: { plan?: string }): Promise<SyncCompetitionsBatchResult> {
    this.logger.log('[Sync] Fetching competition list from external API...');

    // 1. EXTRACT: Get competition list
    const listDto = await this.footballApiClient.getCompetitions(params);

    const competitions = listDto.competitions || [];
    const results: SyncCompetitionResult[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    this.logger.log(`[Sync] Found ${competitions.length} competitions to process`);

    for (const comp of competitions) {
      if (!comp || comp.id === null || comp.id === undefined) {
        continue;
      }

      const externalIdStr = String(comp.id);
      try {
        // Fetch full competition details including historical seasons
        const syncResult = await this.syncCompetitionById(comp.id);
        results.push(syncResult);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync competition ${externalIdStr} (${comp.name}): ${errorMsg}`,
        );
        errors.push({
          externalId: externalIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: competitions.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
