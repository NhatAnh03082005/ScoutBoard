import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  API_FOOTBALL_CLIENT,
  ApiFootballClientPort,
} from '../../../external-football/application/ports/api-football-client.port';
import { ApiFootballPlayerMatchStatisticMapper } from '../../../external-football/infrastructure/mappers/api-football-player-match-statistic.mapper';
import { PersistPlayerMatchStatisticsUseCase } from '../use-cases/persist-player-match-statistics.use-case';
import { PersistPlayerMatchStatisticInput } from '../ports/player-match-statistic-write.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerOrmEntity } from '../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

export interface FixturePlayerStatsSyncResult {
  fixtureExternalId: string;
  matchId: string;
  totalPlayersInFixture: number;
  persistedCount: number;
  skippedCount: number;
  unresolvedPlayers: number;
  errors: Array<{ playerId?: string; error: string }>;
}

@Injectable()
export class ApiFootballPlayerMatchStatsSyncService {
  private readonly logger = new Logger(ApiFootballPlayerMatchStatsSyncService.name);

  constructor(
    @Inject(API_FOOTBALL_CLIENT)
    private readonly apiClient: ApiFootballClientPort,
    private readonly persistStatsUseCase: PersistPlayerMatchStatisticsUseCase,
    @InjectRepository(MatchOrmEntity)
    private readonly matchRepository: Repository<MatchOrmEntity>,
    @InjectRepository(TeamOrmEntity)
    private readonly teamRepository: Repository<TeamOrmEntity>,
    @InjectRepository(PlayerOrmEntity)
    private readonly playerRepository: Repository<PlayerOrmEntity>,
  ) {}

  async syncStatisticsByFixtureId(
    fixtureExternalId: string | number,
    matchInternalId?: string,
  ): Promise<FixturePlayerStatsSyncResult> {
    const fixtureExtId = String(fixtureExternalId);
    this.logger.log(`Fetching player statistics for Fixture ${fixtureExtId} from API-Football...`);

    // 1. Resolve internal Match UUID
    let matchId = matchInternalId;
    if (!matchId) {
      const match = await this.matchRepository.findOne({
        where: {
          externalProvider: 'API_FOOTBALL',
          externalId: fixtureExtId,
        },
      });
      if (!match) {
        throw new NotFoundException(
          `Match with external ID ${fixtureExtId} (API_FOOTBALL) not found in database. Sync matches first.`,
        );
      }
      matchId = match.id;
    }

    // 2. Fetch from API-Football
    const res = await this.apiClient.getFixturePlayers({
      fixture: parseInt(fixtureExtId, 10),
    });

    const teamResponses = res?.response || [];
    if (teamResponses.length === 0) {
      this.logger.warn(`No player statistics found for fixture ${fixtureExtId}`);
      return {
        fixtureExternalId: fixtureExtId,
        matchId,
        totalPlayersInFixture: 0,
        persistedCount: 0,
        skippedCount: 0,
        unresolvedPlayers: 0,
        errors: [],
      };
    }

    // 3. Pre-load teams & players by externalId to minimize DB queries
    const teamExtIds = teamResponses.map((t) => String(t.team.id));
    const teams = await this.teamRepository.find({
      where: {
        externalProvider: 'API_FOOTBALL',
        externalId: In(teamExtIds),
      },
    });
    const teamMap = new Map<string, string>();
    teams.forEach((t) => teamMap.set(t.externalId, t.id));

    // Gather all player external IDs
    const allPlayerExtIds: string[] = [];
    teamResponses.forEach((t) => {
      (t.players || []).forEach((p) => {
        if (p.player?.id) allPlayerExtIds.push(String(p.player.id));
      });
    });

    const players = await this.playerRepository.find({
      where: {
        externalProvider: 'API_FOOTBALL',
        externalId: In(allPlayerExtIds),
      },
    });
    const playerMap = new Map<string, string>();
    players.forEach((p) => playerMap.set(p.externalId, p.id));

    // 4. Map to PersistPlayerMatchStatisticInput
    const inputsToPersist: PersistPlayerMatchStatisticInput[] = [];
    let unresolvedPlayers = 0;
    let totalPlayers = 0;

    for (const teamItem of teamResponses) {
      const teamExtId = String(teamItem.team.id);
      const teamInternalId = teamMap.get(teamExtId);

      if (!teamInternalId) {
        this.logger.warn(
          `Team external ID ${teamExtId} not found in database for fixture ${fixtureExtId}. Skipping its players.`,
        );
        continue;
      }

      for (const p of teamItem.players || []) {
        totalPlayers++;
        const playerExtId = String(p.player.id);
        const playerInternalId = playerMap.get(playerExtId);

        if (!playerInternalId) {
          unresolvedPlayers++;
          this.logger.warn(
            `Player external ID ${playerExtId} (${p.player.name}) not found in database. Skipping stat record.`,
          );
          continue;
        }

        const transformed = ApiFootballPlayerMatchStatisticMapper.toTransformedStatistic(
          p,
          teamExtId,
          fixtureExtId,
        );

        inputsToPersist.push({
          matchId,
          playerId: playerInternalId,
          teamId: teamInternalId,
          minutesPlayed: transformed.minutesPlayed,
          isStarter: transformed.isStarter,
          rating: transformed.rating,
          goals: transformed.goals,
          assists: transformed.assists,
          shots: transformed.shots,
          keyPasses: transformed.keyPasses,
          passesAttempted: transformed.passesAttempted,
          passesCompleted: transformed.passesCompleted,
          tackles: transformed.tackles,
          interceptions: transformed.interceptions,
          yellowCards: transformed.yellowCards,
          redCards: transformed.redCards,
          saves: transformed.saves,
          goalsConceded: transformed.goalsConceded,
          cleanSheets: transformed.cleanSheets,
          penaltiesSaved: transformed.penaltiesSaved,
          statistics: transformed.extendedStatistics,
        });
      }
    }

    // 5. Persist batch
    this.logger.log(
      `Persisting ${inputsToPersist.length} player match statistics for match ${matchId}...`,
    );

    const batchResult = await this.persistStatsUseCase.executeBatch(
      matchId,
      inputsToPersist,
    );

    this.logger.log(
      `Fixture ${fixtureExtId} sync finished: ${batchResult.persisted}/${inputsToPersist.length} persisted, ${batchResult.skipped} skipped, ${unresolvedPlayers} unresolved`,
    );

    return {
      fixtureExternalId: fixtureExtId,
      matchId,
      totalPlayersInFixture: totalPlayers,
      persistedCount: batchResult.persisted,
      skippedCount: batchResult.skipped,
      unresolvedPlayers,
      errors: batchResult.errors.map((e) => ({
        playerId: e.playerId,
        error: e.reason,
      })),
    };
  }
}
