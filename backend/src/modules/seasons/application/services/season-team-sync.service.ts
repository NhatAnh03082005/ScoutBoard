import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FOOTBALL_API_CLIENT,
  FootballApiClient,
} from '../../../external-football/application/ports/football-api-client.port';
import { FootballDataTeamMapper } from '../../../external-football/infrastructure/mappers/football-data-team.mapper';
import { PersistSeasonTeamsUseCase } from '../use-cases/persist-season-teams.use-case';
import { PersistTeamUseCase } from '../../../teams/application/use-cases/persist-team.use-case';
import {
  COMPETITION_WRITE_REPOSITORY,
  CompetitionWriteRepository,
} from '../../../competitions/application/ports/competition-write.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from '../ports/season-read.repository';
import {
  SEASON_WRITE_REPOSITORY,
  SeasonWriteRepository,
} from '../ports/season-write.repository';

export interface SyncSeasonTeamsResult {
  competitionId: string;
  seasonId: string;
  seasonName: string;
  totalTeamsSynced: number;
  teamIds: string[];
}

@Injectable()
export class SeasonTeamSyncService {
  private readonly logger = new Logger(SeasonTeamSyncService.name);

  constructor(
    @Inject(FOOTBALL_API_CLIENT)
    private readonly footballApiClient: FootballApiClient,
    private readonly persistSeasonTeamsUseCase: PersistSeasonTeamsUseCase,
    private readonly persistTeamUseCase: PersistTeamUseCase,
    @Inject(COMPETITION_WRITE_REPOSITORY)
    private readonly competitionWriteRepository: CompetitionWriteRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
    @Inject(SEASON_WRITE_REPOSITORY)
    private readonly seasonWriteRepository: SeasonWriteRepository,
  ) {}

  /**
   * Syncs and links all teams participating in a competition season
   */
  async syncSeasonTeams(
    competitionCode: string,
    seasonYear?: number,
  ): Promise<SyncSeasonTeamsResult> {
    if (!competitionCode || competitionCode.trim() === '') {
      throw new BadRequestException('Competition code is required');
    }

    const compCode = competitionCode.trim();
    this.logger.log(
      `[Sync] Extracting teams for competition "${compCode}" (season: ${seasonYear || 'current'})`,
    );

    // 1. EXTRACT: Call external API for teams in competition
    const listDto = await this.footballApiClient.getTeams({
      competitionCode: compCode,
      season: seasonYear,
    });

    const rawTeams = listDto.teams || [];
    this.logger.log(`[Sync] Found ${rawTeams.length} teams in response`);

    // 2. Resolve internal Competition UUID
    const compEntity = await this.competitionWriteRepository.findByExternalIdentity(
      'FOOTBALL_DATA_ORG',
      compCode,
    );

    if (!compEntity) {
      throw new NotFoundException(
        `Competition with code/external ID "${compCode}" not found in database. Sync competition first.`,
      );
    }

    // 3. Resolve internal Season UUID
    let seasonEntity = null;
    if (seasonYear) {
      const allSeasons = await this.seasonReadRepository.findByCompetition(compEntity.id);
      seasonEntity = allSeasons.find(
        (s) =>
          s.seasonCode === String(seasonYear) ||
          s.name.includes(String(seasonYear)),
      );
    }

    if (!seasonEntity) {
      seasonEntity = await this.seasonReadRepository.findCurrentByCompetitionId(compEntity.id);
    }

    if (!seasonEntity) {
      throw new NotFoundException(
        `Target season for competition "${compCode}" not found in database. Sync season first.`,
      );
    }

    // 4. TRANSFORM & PERSIST Teams to ensure they exist in PostgreSQL
    const persistedTeamIds: string[] = [];
    for (const rawTeam of rawTeams) {
      if (!rawTeam || rawTeam.id === null || rawTeam.id === undefined) {
        continue;
      }
      try {
        const transformedTeam = FootballDataTeamMapper.toTransformedTeam(rawTeam);
        const persistedTeam = await this.persistTeamUseCase.execute(transformedTeam);
        persistedTeamIds.push(persistedTeam.id);
      } catch (err: any) {
        this.logger.warn(
          `[Sync] Skipping invalid team in squad: ${err?.message || err}`,
        );
      }
    }

    // 5. LOAD: Persist relationships into season_teams
    const linkResult = await this.persistSeasonTeamsUseCase.execute({
      seasonId: seasonEntity.id,
      teamIds: persistedTeamIds,
    });

    this.logger.log(
      `[Sync] Successfully linked ${linkResult.totalLinked} teams to season "${seasonEntity.name}" (ID: ${seasonEntity.id})`,
    );

    return {
      competitionId: compEntity.id,
      seasonId: seasonEntity.id,
      seasonName: seasonEntity.name,
      totalTeamsSynced: linkResult.totalLinked,
      teamIds: persistedTeamIds,
    };
  }
}
