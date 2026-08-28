import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SPORTMONKS_API_CLIENT,
  SportmonksApiClient,
} from '../../../external-football/application/ports/sportmonks-api-client.port';
import {
  SportmonksFixtureDto,
} from '../../../external-football/infrastructure/dto/sportmonks-fixture.dto';
import { SportmonksPlayerMatchStatisticMapper } from '../../../external-football/infrastructure/mappers/sportmonks-player-match-statistic.mapper';
import {
  SportmonksIdentityResolver,
  CandidatePlayer,
} from '../../../external-football/domain/services/sportmonks-identity.resolver';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { ReconcileSportmonksMatchUseCase } from '../use-cases/reconcile-sportmonks-match.use-case';
import {
  PersistPlayerMatchStatisticsUseCase,
} from '../use-cases/persist-player-match-statistics.use-case';
import {
  PersistPlayerMatchStatisticInput,
} from '../ports/player-match-statistic-write.repository';

export interface SyncPlayerMatchStatisticsResult {
  fixtureId: string | number;
  matchId: string | null;
  status: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'INVALID';
  totalLineups: number;
  persisted: number;
  unresolvedPlayers: number;
  skipped: number;
  failed: number;
  errors: Array<{ playerId?: string | number; reason: string }>;
}

export interface SyncPlayerMatchStatisticsBatchResult {
  totalRequested: number;
  processed: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  invalid: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  results: SyncPlayerMatchStatisticsResult[];
  errors: Array<{ fixtureId: string | number; reason: string }>;
}

@Injectable()
export class PlayerMatchStatisticsSyncService {
  private readonly logger = new Logger(PlayerMatchStatisticsSyncService.name);

  constructor(
    @Inject(SPORTMONKS_API_CLIENT)
    private readonly sportmonksClient: SportmonksApiClient,
    private readonly reconcileMatchUseCase: ReconcileSportmonksMatchUseCase,
    private readonly persistStatsUseCase: PersistPlayerMatchStatisticsUseCase,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepository: Repository<MatchOrmEntity>,
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
    @InjectRepository(TeamOrmEntity)
    private readonly teamRepository: Repository<TeamOrmEntity>,
  ) {}

  /**
   * Syncs statistics for a single Sportmonks fixture by external fixture ID
   */
  async syncStatisticsByFixtureId(
    fixtureId: number | string,
    canonicalMatchId?: string,
  ): Promise<SyncPlayerMatchStatisticsResult> {
    if (fixtureId === null || fixtureId === undefined || String(fixtureId).trim() === '') {
      throw new BadRequestException('Fixture ID is required');
    }

    const fixtureIdStr = String(fixtureId).trim();
    this.logger.log(`[StatsSync] Fetching fixture detail for ID: ${fixtureIdStr}`);

    // 1. EXTRACT: Fetch fixture with lineups, details, events, statistics
    const fixture = await this.sportmonksClient.getFixtureById(fixtureIdStr);

    return this.processFixtureStatistics(fixture, canonicalMatchId);
  }

  /**
   * Syncs player match statistics in bulk by date with Zero N+1 API calls
   */
  async syncStatisticsByDate(
    date: string,
  ): Promise<SyncPlayerMatchStatisticsBatchResult> {
    if (!date || String(date).trim() === '') {
      throw new BadRequestException('Date is required (YYYY-MM-DD)');
    }

    this.logger.log(`[StatsSync] Bulk fetching fixtures for date: ${date}`);
    const listDto = await this.sportmonksClient.getFixturesByDate(date.trim());
    const fixtures = Array.isArray(listDto) ? listDto : (listDto?.data || []);

    return this.processBatchFixtures(fixtures);
  }

  /**
   * Syncs player match statistics in bulk between date range
   */
  async syncStatisticsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<SyncPlayerMatchStatisticsBatchResult> {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required (YYYY-MM-DD)');
    }

    this.logger.log(`[StatsSync] Bulk fetching fixtures between ${startDate} and ${endDate}`);
    const listDto = await this.sportmonksClient.getFixturesByDateRange(startDate.trim(), endDate.trim());
    const fixtures = Array.isArray(listDto) ? listDto : (listDto?.data || []);

    return this.processBatchFixtures(fixtures);
  }

  /**
   * Processes player match statistics for a single Sportmonks fixture
   */
  private async processFixtureStatistics(
    fixture: SportmonksFixtureDto,
    canonicalMatchId?: string,
  ): Promise<SyncPlayerMatchStatisticsResult> {
    if (!fixture || !fixture.id) {
      return {
        fixtureId: fixture?.id ?? 'unknown',
        matchId: null,
        status: 'INVALID',
        totalLineups: 0,
        persisted: 0,
        unresolvedPlayers: 0,
        skipped: 0,
        failed: 0,
        errors: [{ reason: 'Invalid or missing fixture payload' }],
      };
    }

    const fixtureIdStr = String(fixture.id).trim();

    // 2. MATCH IDENTITY RESOLUTION: Reconcile or verify canonical Match
    let canonicalMatch: MatchOrmEntity | null = null;
    let reconciliationStatus: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'INVALID' = 'MATCHED';

    if (canonicalMatchId) {
      canonicalMatch = await this.matchRepository.findOne({
        where: { id: canonicalMatchId },
      });
      if (!canonicalMatch) {
        return {
          fixtureId: fixtureIdStr,
          matchId: canonicalMatchId,
          status: 'UNMATCHED',
          totalLineups: 0,
          persisted: 0,
          unresolvedPlayers: 0,
          skipped: 0,
          failed: 0,
          errors: [{ reason: `Specified canonical match ID ${canonicalMatchId} not found` }],
        };
      }
    } else {
      // Find Home and Away teams from participants
      const homePart = fixture.participants?.find((p) => p.meta?.location === 'home');
      const awayPart = fixture.participants?.find((p) => p.meta?.location === 'away');

      const resolvedHomeTeam = homePart
        ? await this.findTeamByExternalOrName(homePart.id, homePart.name)
        : null;
      const resolvedAwayTeam = awayPart
        ? await this.findTeamByExternalOrName(awayPart.id, awayPart.name)
        : null;

      if (!resolvedHomeTeam || !resolvedAwayTeam) {
        this.logger.warn(
          `[StatsSync] Could not resolve Home/Away teams for fixture ${fixtureIdStr} (${fixture.name})`,
        );
        return {
          fixtureId: fixtureIdStr,
          matchId: null,
          status: 'UNMATCHED',
          totalLineups: 0,
          persisted: 0,
          unresolvedPlayers: 0,
          skipped: 0,
          failed: 0,
          errors: [{ reason: 'Could not resolve home or away team identities' }],
        };
      }

      const reconResult = await this.reconcileMatchUseCase.execute({
        fixture,
        resolvedHomeTeamId: resolvedHomeTeam.id,
        resolvedAwayTeamId: resolvedAwayTeam.id,
      });

      reconciliationStatus = reconResult.status;
      canonicalMatch = reconResult.matchedMatch;

      if (reconResult.status !== 'MATCHED' || !canonicalMatch) {
        this.logger.warn(
          `[StatsSync] Fixture ${fixtureIdStr} reconciliation status: ${reconResult.status} (reason: ${reconResult.reason})`,
        );
        return {
          fixtureId: fixtureIdStr,
          matchId: null,
          status: reconResult.status,
          totalLineups: 0,
          persisted: 0,
          unresolvedPlayers: 0,
          skipped: 0,
          failed: 0,
          errors: [{ reason: reconResult.reason || `Reconciliation returned ${reconResult.status}` }],
        };
      }
    }

    // 3. RETRIEVE SQUAD CANDIDATES for Home & Away Teams
    const [homeSquad, awaySquad] = await Promise.all([
      this.playerRepository.find({ where: { currentTeamId: canonicalMatch.homeTeamId } }),
      this.playerRepository.find({ where: { currentTeamId: canonicalMatch.awayTeamId } }),
    ]);

    const homeCandidates: CandidatePlayer[] = homeSquad.map((p) => ({
      id: p.id,
      name: p.name,
      normalizedName: p.normalizedName,
      shirtNumber: p.shirtNumber,
      externalProvider: p.externalProvider,
      externalId: p.externalId,
    }));

    const awayCandidates: CandidatePlayer[] = awaySquad.map((p) => ({
      id: p.id,
      name: p.name,
      normalizedName: p.normalizedName,
      shirtNumber: p.shirtNumber,
      externalProvider: p.externalProvider,
      externalId: p.externalId,
    }));

    // 4. LINEUP RESOLUTION & MAPPING
    const lineups = fixture.lineups || [];
    const validStatsToPersist: PersistPlayerMatchStatisticInput[] = [];
    const errors: Array<{ playerId?: string | number; reason: string }> = [];
    let unresolvedPlayers = 0;
    let skipped = 0;

    const homePartId = fixture.participants?.find((p) => p.meta?.location === 'home')?.id;
    const awayPartId = fixture.participants?.find((p) => p.meta?.location === 'away')?.id;

    for (const lineup of lineups) {
      if (!lineup || !lineup.player_id) {
        skipped++;
        continue;
      }

      try {
        // A. Resolve Team Identity
        const teamResolution = SportmonksIdentityResolver.resolveTeamIdentity({
          sportmonksTeamId: lineup.team_id,
          location: (lineup as any).location,
          matchHomeTeamId: canonicalMatch.homeTeamId,
          matchAwayTeamId: canonicalMatch.awayTeamId,
          sportmonksHomeParticipantId: homePartId,
          sportmonksAwayParticipantId: awayPartId,
        });

        if (!teamResolution.resolved || !teamResolution.teamId) {
          unresolvedPlayers++;
          errors.push({
            playerId: lineup.player_id,
            reason: `Could not resolve team identity for lineup player ${lineup.player_id}`,
          });
          continue;
        }

        const candidatePool =
          teamResolution.teamId === canonicalMatch.homeTeamId ? homeCandidates : awayCandidates;

        // B. Resolve Player Identity
        const playerResolution = SportmonksIdentityResolver.resolvePlayerIdentity({
          sportmonksPlayerId: lineup.player_id,
          playerName: lineup.player?.name,
          shirtNumber: lineup.jersey_number,
          teamId: teamResolution.teamId,
          candidateSquadPlayers: candidatePool,
        });

        if (!playerResolution.resolved || !playerResolution.playerId) {
          unresolvedPlayers++;
          errors.push({
            playerId: lineup.player_id,
            reason: `Unresolved player identity: ${playerResolution.reason || 'Player not found in squad'}`,
          });
          continue;
        }

        // C. Map Statistics via Pure Domain Mapper
        const transformedStat =
          SportmonksPlayerMatchStatisticMapper.toTransformedPlayerMatchStatistic(
            lineup,
            fixture,
          );

        validStatsToPersist.push({
          matchId: canonicalMatch.id,
          playerId: playerResolution.playerId,
          teamId: teamResolution.teamId,
          minutesPlayed: transformedStat.minutesPlayed,
          isStarter: transformedStat.isStarter,
          rating: transformedStat.rating,
          goals: transformedStat.goals,
          assists: transformedStat.assists,
          shots: transformedStat.shots,
          keyPasses: transformedStat.keyPasses,
          passesAttempted: transformedStat.passesAttempted,
          passesCompleted: transformedStat.passesCompleted,
          tackles: transformedStat.tackles,
          interceptions: transformedStat.interceptions,
          yellowCards: transformedStat.yellowCards,
          redCards: transformedStat.redCards,
          saves: transformedStat.saves,
          goalsConceded: transformedStat.goalsConceded,
          cleanSheets: transformedStat.cleanSheets,
          penaltiesSaved: transformedStat.penaltiesSaved,
          statistics: transformedStat.extendedStatistics,
        });
      } catch (err: any) {
        errors.push({
          playerId: lineup.player_id,
          reason: `Error mapping lineup: ${err?.message || err}`,
        });
      }
    }

    // 5. PERSIST: Batch persistence with error isolation
    let persistedCount = 0;
    if (validStatsToPersist.length > 0) {
      const batchResult = await this.persistStatsUseCase.executeBatch(
        canonicalMatch.id,
        validStatsToPersist,
      );
      persistedCount = batchResult.persisted;
      if (batchResult.errors.length > 0) {
        for (const err of batchResult.errors) {
          errors.push({ playerId: err.playerId, reason: err.reason });
        }
      }
    }

    this.logger.log(
      `[StatsSync] Fixture ${fixtureIdStr} -> Match ${canonicalMatch.id}: Persisted ${persistedCount}/${lineups.length} player stats (Unresolved: ${unresolvedPlayers}, Errors: ${errors.length})`,
    );

    return {
      fixtureId: fixtureIdStr,
      matchId: canonicalMatch.id,
      status: reconciliationStatus,
      totalLineups: lineups.length,
      persisted: persistedCount,
      unresolvedPlayers,
      skipped,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Processes a batch of Sportmonks fixtures with error isolation
   */
  private async processBatchFixtures(
    fixtures: SportmonksFixtureDto[],
  ): Promise<SyncPlayerMatchStatisticsBatchResult> {
    const list = Array.isArray(fixtures) ? fixtures : [];
    const results: SyncPlayerMatchStatisticsResult[] = [];
    const batchErrors: Array<{ fixtureId: string | number; reason: string }> = [];

    let matched = 0;
    let unmatched = 0;
    let ambiguous = 0;
    let invalid = 0;
    let created = 0;
    let failed = 0;
    let skipped = 0;

    for (const fixture of list) {
      const fixId = fixture?.id ?? 'unknown';
      try {
        const res = await this.processFixtureStatistics(fixture);
        results.push(res);

        if (res.status === 'MATCHED') {
          matched++;
          created += res.persisted;
        } else if (res.status === 'UNMATCHED') {
          unmatched++;
        } else if (res.status === 'AMBIGUOUS') {
          ambiguous++;
        } else if (res.status === 'INVALID') {
          invalid++;
        }

        failed += res.failed;
        skipped += res.skipped + res.unresolvedPlayers;
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        this.logger.error(`[StatsSync] Failed processing fixture ${fixId}: ${errMsg}`);
        batchErrors.push({ fixtureId: fixId, reason: errMsg });
        failed++;
      }
    }

    return {
      totalRequested: list.length,
      processed: results.length,
      matched,
      unmatched,
      ambiguous,
      invalid,
      created,
      updated: 0,
      failed,
      skipped,
      results,
      errors: batchErrors,
    };
  }

  private async findTeamByExternalOrName(
    externalId: number | string,
    teamName?: string,
  ): Promise<TeamOrmEntity | null> {
    const extIdStr = String(externalId).trim();

    // 1. Check direct Sportmonks external ID
    const bySportmonks = await this.teamRepository.findOne({
      where: { externalProvider: 'SPORTMONKS', externalId: extIdStr },
    });
    if (bySportmonks) return bySportmonks;

    // 2. Check canonical football-data.org team by name
    if (teamName && teamName.trim() !== '') {
      const allTeams = await this.teamRepository.find();
      const normInput = teamName.toLowerCase().replace(/[\.\,\-]/g, '').trim();

      const matchedTeam = allTeams.find((t) => {
        const normDb = ((t as any).normalizedName || t.name).toLowerCase().replace(/[\.\,\-]/g, '').trim();
        return normDb === normInput || (normDb.length >= 5 && normInput.includes(normDb));
      });

      if (matchedTeam) return matchedTeam;
    }

    return null;
  }
}
