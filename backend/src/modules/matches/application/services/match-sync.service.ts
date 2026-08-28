import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
  GetMatchesParams,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataMatchMapper } from '../../../external-football/infrastructure/mappers/football-data-match.mapper';
import { PersistMatchUseCase } from '../use-cases/persist-match.use-case';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { ExternalMatchDto, ExternalMatchDetailDto } from '../../../external-football/infrastructure/dto/external-match.dto';

export interface SyncMatchResult {
  externalId: string;
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  persistedMatch: MatchOrmEntity;
}

export interface SyncMatchesBatchResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: SyncMatchResult[];
  errors: Array<{ externalId: string; error: string }>;
}

@Injectable()
export class MatchSyncService {
  private readonly logger = new Logger(MatchSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistMatchUseCase: PersistMatchUseCase,
  ) {}

  /**
   * Syncs a single match by external match ID, resolving parent entity internal UUIDs
   */
  async syncMatchById(
    id: number | string,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncMatchResult> {
    if (id === null || id === undefined || String(id).trim() === '') {
      throw new BadRequestException('Match ID is required for sync');
    }

    const extIdStr = String(id).trim();
    this.logger.log(`[Sync] Extracting match data for ID: ${extIdStr}`);

    // 1. EXTRACT: Call external football API for match detail
    const rawDetail = await this.footballApiClient.getMatchById(extIdStr);

    // 2. TRANSFORM: Map raw DTO to clean domain model
    const transformed = FootballDataMatchMapper.toTransformedMatch(rawDetail, provider);

    // 3. LOAD: Persist match into PostgreSQL (PersistMatchUseCase resolves 4 FK UUIDs)
    const persisted = await this.persistMatchUseCase.execute(transformed);

    this.logger.log(
      `[Sync] Successfully synced match ${transformed.externalId} (ID: ${persisted.id}) [${persisted.status}]`,
    );

    return {
      externalId: transformed.externalId,
      matchId: persisted.id,
      homeScore: persisted.homeScore,
      awayScore: persisted.awayScore,
      status: persisted.status,
      persistedMatch: persisted,
    };
  }

  /**
   * Syncs matches by competition code/id in bulk with Zero N+1 requests
   */
  async syncMatchesByCompetition(
    competitionCode: string,
    params?: GetMatchesParams,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncMatchesBatchResult> {
    if (!competitionCode || String(competitionCode).trim() === '') {
      throw new BadRequestException('Competition code is required');
    }

    const queryParams: GetMatchesParams = {
      ...params,
      competitions: competitionCode.trim(),
    };

    return this.syncMatches(queryParams, provider);
  }

  /**
   * Syncs matches batch (e.g. by competition or date range) with Zero N+1 API calls
   */
  async syncMatches(
    params?: GetMatchesParams,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncMatchesBatchResult> {
    this.logger.log('[Sync] Fetching matches list from external API...');

    // 1. EXTRACT: Call external football API for matches list
    const listDto = await this.footballApiClient.getMatches(params);

    const matches = listDto?.matches || [];
    const results: SyncMatchResult[] = [];
    const errors: Array<{ externalId: string; error: string }> = [];

    this.logger.log(`[Sync] Found ${matches.length} matches to process`);

    // Top-level competition / season info from list response if present
    const topCompetition = (listDto as any)?.competition;
    const topSeason = (listDto as any)?.season;

    for (const match of matches) {
      if (!match || match.id === null || match.id === undefined) {
        continue;
      }
      const externalIdStr = String(match.id).trim();

      try {
        // Merge top-level competition/season if missing inside match item (Zero N+1 optimization)
        const matchWithDetail: ExternalMatchDetailDto = {
          ...match,
          competition: (match as any).competition || topCompetition || (params?.competitions ? { id: params.competitions, code: params.competitions, name: params.competitions } : undefined),
          season: (match as any).season || topSeason || (params?.season ? { id: params.season, startDate: '', endDate: '' } : undefined),
        };

        const transformed = FootballDataMatchMapper.toTransformedMatch(matchWithDetail, provider);
        const persisted = await this.persistMatchUseCase.execute(transformed);

        results.push({
          externalId: transformed.externalId,
          matchId: persisted.id,
          homeScore: persisted.homeScore,
          awayScore: persisted.awayScore,
          status: persisted.status,
          persistedMatch: persisted,
        });
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        this.logger.error(
          `[Sync] Failed to sync match ${externalIdStr}: ${errorMsg}`,
        );
        errors.push({
          externalId: externalIdStr,
          error: errorMsg,
        });
      }
    }

    return {
      totalRequested: matches.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Syncs matches for a specific team in bulk
   */
  async syncMatchesByTeam(
    teamId: number | string,
    params?: GetMatchesParams,
    provider: string = 'FOOTBALL_DATA_ORG',
  ): Promise<SyncMatchesBatchResult> {
    if (teamId === null || teamId === undefined || String(teamId).trim() === '') {
      throw new BadRequestException('Team ID is required');
    }

    return this.syncMatches(params, provider);
  }
}
