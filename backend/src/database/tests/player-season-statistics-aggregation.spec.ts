import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { TypeOrmPlayerSeasonStatisticWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-season-statistic-write.repository';
import { PlayerSeasonStatisticsAggregationService } from '../../modules/players/application/services/player-season-statistics-aggregation.service';

describe('PlayerSeasonStatisticsAggregation (Live PostgreSQL Integration)', () => {
  let aggService: PlayerSeasonStatisticsAggregationService;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testTeam: TeamOrmEntity;
  let testOpponentTeam: TeamOrmEntity;
  let testMatch1: MatchOrmEntity;
  let testMatch2: MatchOrmEntity;
  let testPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const prefix = `season-agg-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamRepo = AppDataSource.getRepository(TeamOrmEntity);
    const playerRepo = AppDataSource.getRepository(PlayerOrmEntity);
    const matchRepo = AppDataSource.getRepository(MatchOrmEntity);
    const matchStatRepo = AppDataSource.getRepository(
      PlayerMatchStatisticOrmEntity,
    );
    const seasonStatRepo = AppDataSource.getRepository(
      PlayerSeasonStatisticOrmEntity,
    );

    const writeRepo = new TypeOrmPlayerSeasonStatisticWriteRepository(
      seasonStatRepo,
    );
    aggService = new PlayerSeasonStatisticsAggregationService(
      writeRepo,
      matchStatRepo,
      matchRepo,
    );

    // 1. Seed competition & season
    testComp = await compRepo.save(
      compRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-comp`,
        name: 'Aggregation League',
        code: 'AGGL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProvider,
        externalId: `${prefix}-season`,
        name: 'Aggregation Season 2026',
        code: 'AGGS_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    testTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-team-1`,
        name: 'Agg Team FC',
        normalizedName: 'agg team fc',
      }),
    );

    testOpponentTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-team-2`,
        name: 'Opponent FC',
        normalizedName: 'opponent fc',
      }),
    );

    testPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-player-1`,
        name: 'Agg Star Player',
        normalizedName: 'agg star player',
        shirtNumber: 10,
        currentTeamId: testTeam.id,
      }),
    );

    // 2. Create 2 Matches in the same season
    testMatch1 = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testTeam.id,
        awayTeamId: testOpponentTeam.id,
        externalProvider: testProvider,
        externalId: `${prefix}-match-1`,
        matchDate: new Date('2026-08-20T19:00:00Z'),
        status: 'FINISHED',
      }),
    );

    testMatch2 = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testOpponentTeam.id,
        awayTeamId: testTeam.id,
        externalProvider: testProvider,
        externalId: `${prefix}-match-2`,
        matchDate: new Date('2026-08-27T19:00:00Z'),
        status: 'FINISHED',
      }),
    );

    // 3. Seed match statistics:
    // Match 1: 90 mins, starter, 2 goals, 1 assist, 40 passes
    await matchStatRepo.save(
      matchStatRepo.create({
        matchId: testMatch1.id,
        playerId: testPlayer.id,
        teamId: testTeam.id,
        minutesPlayed: 90,
        isStarter: true,
        goals: 2,
        assists: 1,
        passesAttempted: 40,
        passesCompleted: 35,
        tackles: 2,
        interceptions: 1,
      }),
    );

    // Match 2: 45 mins, substitute, 1 goal, 0 assists, 20 passes
    await matchStatRepo.save(
      matchStatRepo.create({
        matchId: testMatch2.id,
        playerId: testPlayer.id,
        teamId: testTeam.id,
        minutesPlayed: 45,
        isStarter: false,
        goals: 1,
        assists: 0,
        passesAttempted: 20,
        passesCompleted: 15,
        tackles: 1,
        interceptions: 0,
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerSeasonStatisticOrmEntity).delete({
        playerId: testPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerMatchStatisticOrmEntity).delete({
        playerId: testPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testPlayer?.id,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch1?.id,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch2?.id,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        id: testSeason?.id,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        id: testComp?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testTeam?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testOpponentTeam?.id,
      });

      await AppDataSource.destroy();
    }
  });

  it('should aggregate match statistics into player_season_statistics with accurate per-90 metrics', async () => {
    const persisted = await aggService.aggregatePlayerSeason({
      playerId: testPlayer.id,
      seasonId: testSeason.id,
      competitionId: testComp.id,
      teamId: testTeam.id,
    });

    expect(persisted).toBeDefined();
    expect(persisted.matchesPlayed).toBe(2);
    expect(persisted.starts).toBe(1);
    expect(persisted.minutesPlayed).toBe(135);
    expect(persisted.goals).toBe(3);
    expect(persisted.assists).toBe(1);
    expect(Number(persisted.goalsPer90)).toBe(2.0); // (3 / 135) * 90 = 2.00
    expect(Number(persisted.assistsPer90)).toBe(0.67); // (1 / 135) * 90 = 0.67

    // Verify row directly in PostgreSQL
    const rows = await AppDataSource.query(
      `SELECT * FROM "player_season_statistics" WHERE "player_id" = $1 AND "season_id" = $2`,
      [testPlayer.id, testSeason.id],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].matches_played).toBe(2);
    expect(rows[0].goals).toBe(3);
    expect(Number(rows[0].goals_per_90)).toBe(2.0);

    // Idempotent rerun: re-running aggregation must update in place without creating duplicates
    await aggService.aggregatePlayerSeason({
      playerId: testPlayer.id,
      seasonId: testSeason.id,
      competitionId: testComp.id,
      teamId: testTeam.id,
    });

    const rowsAfterRerun = await AppDataSource.query(
      `SELECT * FROM "player_season_statistics" WHERE "player_id" = $1 AND "season_id" = $2`,
      [testPlayer.id, testSeason.id],
    );
    expect(rowsAfterRerun).toHaveLength(1); // Invariant maintained: 1 composite row
  });
});
