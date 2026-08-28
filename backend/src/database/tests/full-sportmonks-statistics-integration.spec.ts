import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { ExternalMatchMappingOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';
import { TypeOrmExternalMatchMappingRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-external-match-mapping.repository';
import { TypeOrmPlayerMatchStatisticWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-player-match-statistic-write.repository';
import { TypeOrmPlayerSeasonStatisticWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-season-statistic-write.repository';
import { ReconcileSportmonksMatchUseCase } from '../../modules/matches/application/use-cases/reconcile-sportmonks-match.use-case';
import { PersistPlayerMatchStatisticsUseCase } from '../../modules/matches/application/use-cases/persist-player-match-statistics.use-case';
import { PlayerMatchStatisticsSyncService } from '../../modules/matches/application/services/player-match-statistics-sync.service';
import { PlayerSeasonStatisticsAggregationService } from '../../modules/players/application/services/player-season-statistics-aggregation.service';
import { SportmonksFixtureDto } from '../../modules/external-football/infrastructure/dto/sportmonks-fixture.dto';

describe('Full Sportmonks Statistics Pipeline End-to-End Integration (Task 6.12 Live PostgreSQL)', () => {
  let syncService: PlayerMatchStatisticsSyncService;
  let aggService: PlayerSeasonStatisticsAggregationService;
  let mockSportmonksClient: any;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testMatch: MatchOrmEntity;
  let testStriker: PlayerOrmEntity;
  let testGoalkeeper: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const prefix = `full-pipe-${Date.now()}`;
  const fixtureId = Math.floor(Math.random() * 10000000) + 3000000;
  const homeSmId = Math.floor(Math.random() * 100000) + 80000;
  const awaySmId = Math.floor(Math.random() * 100000) + 90000;
  const strikerSmId = Math.floor(Math.random() * 100000) + 11000;
  const gkSmId = Math.floor(Math.random() * 100000) + 12000;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const compRepo = AppDataSource.getRepository(CompetitionOrmEntity);
    const seasonRepo = AppDataSource.getRepository(SeasonOrmEntity);
    const teamRepo = AppDataSource.getRepository(TeamOrmEntity);
    const playerRepo = AppDataSource.getRepository(PlayerOrmEntity);
    const matchRepo = AppDataSource.getRepository(MatchOrmEntity);
    const mappingRepo = AppDataSource.getRepository(ExternalMatchMappingOrmEntity);
    const matchStatRepo = AppDataSource.getRepository(PlayerMatchStatisticOrmEntity);
    const seasonStatRepo = AppDataSource.getRepository(PlayerSeasonStatisticOrmEntity);

    const extMappingRepo = new TypeOrmExternalMatchMappingRepository(mappingRepo);
    const playerStatWriteRepo = new TypeOrmPlayerMatchStatisticWriteRepository(matchStatRepo);
    const playerSeasonStatWriteRepo = new TypeOrmPlayerSeasonStatisticWriteRepository(seasonStatRepo);

    const reconcileUseCase = new ReconcileSportmonksMatchUseCase(extMappingRepo, matchRepo);
    const persistStatsUseCase = new PersistPlayerMatchStatisticsUseCase(playerStatWriteRepo, matchRepo, playerRepo);

    mockSportmonksClient = {
      getFixtureById: jest.fn(),
      getFixturesByDate: jest.fn(),
      getFixturesBetween: jest.fn(),
      getFixturesBySeason: jest.fn(),
    };

    syncService = new PlayerMatchStatisticsSyncService(
      mockSportmonksClient,
      reconcileUseCase,
      persistStatsUseCase,
      matchRepo,
      playerRepo,
      teamRepo,
    );

    aggService = new PlayerSeasonStatisticsAggregationService(
      playerSeasonStatWriteRepo,
      matchStatRepo,
      matchRepo,
    );

    // 1. Seed canonical football-data.org entities
    testComp = await compRepo.save(
      compRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-comp`,
        name: 'Pipeline League',
        code: 'PIPEL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProvider,
        externalId: `${prefix}-season`,
        name: 'Pipeline Season 2026',
        code: 'PIPE_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    testHomeTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(homeSmId),
        name: 'Arsenal FC',
        normalizedName: 'arsenal fc',
      }),
    );

    testAwayTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(awaySmId),
        name: 'Chelsea FC',
        normalizedName: 'chelsea fc',
      }),
    );

    testStriker = await playerRepo.save(
      playerRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(strikerSmId),
        name: 'Bukayo Saka',
        normalizedName: 'bukayo saka',
        shirtNumber: 7,
        currentTeamId: testHomeTeam.id,
      }),
    );

    testGoalkeeper = await playerRepo.save(
      playerRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(gkSmId),
        name: 'Robert Sanchez',
        normalizedName: 'robert sanchez',
        shirtNumber: 1,
        currentTeamId: testAwayTeam.id,
      }),
    );

    testMatch = await matchRepo.save(
      matchRepo.create({
        competitionId: testComp.id,
        seasonId: testSeason.id,
        homeTeamId: testHomeTeam.id,
        awayTeamId: testAwayTeam.id,
        externalProvider: testProvider,
        externalId: `${prefix}-match-1`,
        matchDate: new Date('2026-08-22T19:00:00Z'),
        status: 'FINISHED',
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerSeasonStatisticOrmEntity).delete({
        playerId: testStriker?.id,
      });
      await AppDataSource.getRepository(PlayerSeasonStatisticOrmEntity).delete({
        playerId: testGoalkeeper?.id,
      });
      await AppDataSource.getRepository(PlayerMatchStatisticOrmEntity).delete({
        matchId: testMatch?.id,
      });
      await AppDataSource.getRepository(ExternalMatchMappingOrmEntity).delete({
        externalProvider: 'SPORTMONKS',
        externalId: String(fixtureId),
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testStriker?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testGoalkeeper?.id,
      });
      await AppDataSource.getRepository(MatchOrmEntity).delete({
        id: testMatch?.id,
      });
      await AppDataSource.getRepository(SeasonOrmEntity).delete({
        id: testSeason?.id,
      });
      await AppDataSource.getRepository(CompetitionOrmEntity).delete({
        id: testComp?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testHomeTeam?.id,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        id: testAwayTeam?.id,
      });

      await AppDataSource.destroy();
    }
  });

  it('should execute full integration chain: match reconciliation -> stats ingestion -> season aggregation', async () => {
    // 1. Sportmonks Fixture Payload
    const smFixture: SportmonksFixtureDto = {
      id: fixtureId,
      name: 'Arsenal vs Chelsea',
      starting_at: '2026-08-22 19:00:00',
      participants: [
        { id: homeSmId, name: 'Arsenal FC', meta: { location: 'home' } },
        { id: awaySmId, name: 'Chelsea FC', meta: { location: 'away' } },
      ],
      lineups: [
        {
          id: 1001,
          fixture_id: fixtureId,
          player_id: strikerSmId,
          team_id: homeSmId,
          position_id: 27,
          jersey_number: 7,
          player: { id: strikerSmId, name: 'Bukayo Saka' },
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'goals', value: 2 },
            { code: 'shots-total', value: 3 },
            { code: 'passes-total', value: 30 },
            { code: 'passes-accurate', value: 25 },
            { code: 'tackles', value: 2 },
            { code: 'interceptions', value: 1 },
          ],
        },
        {
          id: 1002,
          fixture_id: fixtureId,
          player_id: gkSmId,
          team_id: awaySmId,
          position_id: 24,
          jersey_number: 1,
          player: { id: gkSmId, name: 'Robert Sanchez' },
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'saves', value: 4 },
            { code: 'goals-conceded', value: 2 },
            { code: 'cleansheets', value: 0 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(smFixture);

    // 2. Execute Statistics Sync
    const syncResult = await syncService.syncStatisticsByFixtureId(fixtureId);
    expect(syncResult.status).toBe('MATCHED');
    expect(syncResult.matchId).toBe(testMatch.id);
    expect(syncResult.persisted).toBe(2);

    // 3. Verify match mapping cached
    const mapping = await AppDataSource.query(
      `SELECT * FROM "external_match_mappings" WHERE "external_provider" = 'SPORTMONKS' AND "external_id" = $1`,
      [String(fixtureId)],
    );
    expect(mapping).toHaveLength(1);
    expect(mapping[0].match_id).toBe(testMatch.id);

    // 4. Verify match statistics in PostgreSQL
    const strikerMatchStat = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testStriker.id],
    );
    expect(strikerMatchStat).toHaveLength(1);
    expect(strikerMatchStat[0].goals).toBe(2);
    expect(strikerMatchStat[0].passes_completed).toBe(25);
    expect(strikerMatchStat[0].saves).toBeNull(); // Strict NULL GK field

    const gkMatchStat = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testGoalkeeper.id],
    );
    expect(gkMatchStat).toHaveLength(1);
    expect(gkMatchStat[0].saves).toBe(4);
    expect(gkMatchStat[0].goals_conceded).toBe(2);

    // 5. Execute Season Aggregation
    const strikerSeasonStat = await aggService.aggregatePlayerSeason({
      playerId: testStriker.id,
      seasonId: testSeason.id,
      competitionId: testComp.id,
      teamId: testHomeTeam.id,
    });
    expect(strikerSeasonStat.goals).toBe(2);
    expect(Number(strikerSeasonStat.goalsPer90)).toBe(2.0);
    expect(strikerSeasonStat.saves).toBeNull();

    const gkSeasonStat = await aggService.aggregatePlayerSeason({
      playerId: testGoalkeeper.id,
      seasonId: testSeason.id,
      competitionId: testComp.id,
      teamId: testAwayTeam.id,
    });
    expect(gkSeasonStat.saves).toBe(4);
    expect(gkSeasonStat.goalsConceded).toBe(2);
    expect(Number(gkSeasonStat.savePercentage)).toBe(66.67); // (4 / (4 + 2)) * 100 = 66.67%
  });
});
