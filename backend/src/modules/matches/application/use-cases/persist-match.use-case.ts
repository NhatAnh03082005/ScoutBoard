import {
  Injectable,
  Inject,
  Optional,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  MATCH_WRITE_REPOSITORY,
  MatchWriteRepository,
  MatchResolvedReferences,
} from '../ports/match-write.repository';
import {
  COMPETITION_WRITE_REPOSITORY,
  CompetitionWriteRepository,
} from '../../../competitions/application/ports/competition-write.repository';
import {
  SEASON_WRITE_REPOSITORY,
  SeasonWriteRepository,
} from '../../../seasons/application/ports/season-write.repository';
import {
  TEAM_WRITE_REPOSITORY,
  TeamWriteRepository,
} from '../../../teams/application/ports/team-write.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TransformedMatch } from '../../../external-football/domain/models/transformed-match.model';

@Injectable()
export class PersistMatchUseCase {
  constructor(
    @Inject(MATCH_WRITE_REPOSITORY)
    private readonly matchWriteRepository: MatchWriteRepository,
    @Optional()
    @Inject(COMPETITION_WRITE_REPOSITORY)
    private readonly competitionWriteRepository?: CompetitionWriteRepository,
    @Optional()
    @Inject(SEASON_WRITE_REPOSITORY)
    private readonly seasonWriteRepository?: SeasonWriteRepository,
    @Optional()
    @Inject(TEAM_WRITE_REPOSITORY)
    private readonly teamWriteRepository?: TeamWriteRepository,
  ) {}

  async execute(
    input: TransformedMatch,
    refs?: MatchResolvedReferences | null,
  ): Promise<MatchOrmEntity> {
    if (!input) {
      throw new BadRequestException('Transformed match input is required');
    }

    if (!input.externalProvider || String(input.externalProvider).trim() === '') {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    const provider = input.externalProvider.trim();

    // 1. Resolve Competition UUID
    let competitionId = refs?.competitionId ? String(refs.competitionId).trim() : '';
    if (!competitionId) {
      if (!input.competitionExternalId || String(input.competitionExternalId).trim() === '') {
        throw new BadRequestException('competitionId or valid competitionExternalId is required');
      }
      if (!this.competitionWriteRepository) {
        throw new BadRequestException('Competition repository is not available for resolving competition');
      }
      const comp = await this.competitionWriteRepository.findByExternalIdentity(
        provider,
        String(input.competitionExternalId).trim(),
      );
      if (!comp) {
        throw new NotFoundException(
          `Competition with external ID "${input.competitionExternalId}" and provider "${provider}" not found in database. Sync competition first.`,
        );
      }
      competitionId = comp.id;
    }

    // 2. Resolve Season UUID
    let seasonId = refs?.seasonId ? String(refs.seasonId).trim() : '';
    if (!seasonId) {
      if (!input.seasonExternalId || String(input.seasonExternalId).trim() === '') {
        throw new BadRequestException('seasonId or valid seasonExternalId is required');
      }
      if (!this.seasonWriteRepository) {
        throw new BadRequestException('Season repository is not available for resolving season');
      }
      const season = await this.seasonWriteRepository.findByExternalIdentity(
        provider,
        String(input.seasonExternalId).trim(),
      );
      if (!season) {
        throw new NotFoundException(
          `Season with external ID "${input.seasonExternalId}" and provider "${provider}" not found in database. Sync season first.`,
        );
      }
      seasonId = season.id;
    }

    // 3. Resolve Home Team UUID
    let homeTeamId = refs?.homeTeamId ? String(refs.homeTeamId).trim() : '';
    if (!homeTeamId) {
      if (!input.homeTeamExternalId || String(input.homeTeamExternalId).trim() === '') {
        throw new BadRequestException('homeTeamId or valid homeTeamExternalId is required');
      }
      if (!this.teamWriteRepository) {
        throw new BadRequestException('Team repository is not available for resolving home team');
      }
      const team = await this.teamWriteRepository.findByExternalIdentity(
        provider,
        String(input.homeTeamExternalId).trim(),
      );
      if (!team) {
        throw new NotFoundException(
          `Home team with external ID "${input.homeTeamExternalId}" and provider "${provider}" not found in database. Sync team first.`,
        );
      }
      homeTeamId = team.id;
    }

    // 4. Resolve Away Team UUID
    let awayTeamId = refs?.awayTeamId ? String(refs.awayTeamId).trim() : '';
    if (!awayTeamId) {
      if (!input.awayTeamExternalId || String(input.awayTeamExternalId).trim() === '') {
        throw new BadRequestException('awayTeamId or valid awayTeamExternalId is required');
      }
      if (!this.teamWriteRepository) {
        throw new BadRequestException('Team repository is not available for resolving away team');
      }
      const team = await this.teamWriteRepository.findByExternalIdentity(
        provider,
        String(input.awayTeamExternalId).trim(),
      );
      if (!team) {
        throw new NotFoundException(
          `Away team with external ID "${input.awayTeamExternalId}" and provider "${provider}" not found in database. Sync team first.`,
        );
      }
      awayTeamId = team.id;
    }

    if (homeTeamId === awayTeamId) {
      throw new BadRequestException('Match home team and away team cannot be the same');
    }

    const resolvedRefs: MatchResolvedReferences = {
      competitionId,
      seasonId,
      homeTeamId,
      awayTeamId,
    };

    return this.matchWriteRepository.upsert(input, resolvedRefs);
  }

  async executeMany(
    items: Array<{ match: TransformedMatch; refs?: MatchResolvedReferences }>,
  ): Promise<MatchOrmEntity[]> {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const results: MatchOrmEntity[] = [];
    for (const item of items) {
      if (!item || !item.match) continue;
      const res = await this.execute(item.match, item.refs);
      results.push(res);
    }

    return results;
  }
}
