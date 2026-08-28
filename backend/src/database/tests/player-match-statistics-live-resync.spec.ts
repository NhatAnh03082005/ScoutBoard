import AppDataSource from '../data-source';
import { MatchOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { CompetitionOrmEntity } from '../../modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { ExternalMatchMappingOrmEntity } from '../../modules/matches/infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';
import { TypeOrmExternalMatchMappingRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-external-match-mapping.repository';
import { TypeOrmPlayerMatchStatisticWriteRepository } from '../../modules/matches/infrastructure/persistence/typeorm/repositories/typeorm-player-match-statistic-write.repository';
import { ReconcileSportmonksMatchUseCase } from '../../modules/matches/application/use-cases/reconcile-sportmonks-match.use-case';
import { PersistPlayerMatchStatisticsUseCase } from '../../modules/matches/application/use-cases/persist-player-match-statistics.use-case';
import { PlayerMatchStatisticsSyncService } from '../../modules/matches/application/services/player-match-statistics-sync.service';
import { SportmonksFixtureDto } from '../../modules/external-football/infrastructure/dto/sportmonks-fixture.dto';

describe('PlayerMatchStatistics Live Re-sync & Snapshot Invariance (Live PostgreSQL)', () => {
  let syncService: PlayerMatchStatisticsSyncService;
  let mockSportmonksClient: any;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testMatch: MatchOrmEntity;
  let testPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const prefix = `live-sync-${Date.now()}`;
  const testSmFixtureId = Math.floor(Math.random() * 10000000) + 1000000;
  const testSmHomeTeamId = Math.floor(Math.random() * 100000) + 10000;
  const testSmAwayTeamId = Math.floor(Math.random() * 100000) + 20000;
  const testSmPlayerId = Math.floor(Math.random() * 100000) + 30000;

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
    const statRepo = AppDataSource.getRepository(PlayerMatchStatisticOrmEntity);

    const extMappingRepo = new TypeOrmExternalMatchMappingRepository(mappingRepo);
    const playerStatWriteRepo = new TypeOrmPlayerMatchStatisticWriteRepository(statRepo);

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

    // 1. Seed entities
    testComp = await compRepo.save(
      compRepo.create({
        externalProvider: testProvider,
        externalId: `${prefix}-comp`,
        name: 'Live Sync League',
        code: 'LSL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProvider,
        externalId: `${prefix}-season`,
        name: 'Live Sync Season 2026',
        code: 'LS_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    testHomeTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmHomeTeamId),
        name: 'Live Home FC',
        normalizedName: 'live home fc',
      }),
    );

    testAwayTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmAwayTeamId),
        name: 'Live Away FC',
        normalizedName: 'live away fc',
      }),
    );

    testPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmPlayerId),
        name: 'Live Striker',
        normalizedName: 'live striker',
        shirtNumber: 9,
        currentTeamId: testHomeTeam.id,
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
        status: 'IN_PLAY',
      }),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerMatchStatisticOrmEntity).delete({
        matchId: testMatch?.id,
      });
      await AppDataSource.getRepository(ExternalMatchMappingOrmEntity).delete({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmFixtureId),
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testPlayer?.id,
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

  it('should update same record across live match snapshots without row duplication or value accumulation', async () => {
    // SNAPSHOT 1 (30th minute): 1 goal, 15 passes
    const snap30m: SportmonksFixtureDto = {
      id: testSmFixtureId,
      name: 'Live Home FC vs Live Away FC',
      starting_at: '2026-08-22 19:00:00',
      participants: [
        { id: testSmHomeTeamId, name: 'Live Home FC', meta: { location: 'home' } },
        { id: testSmAwayTeamId, name: 'Live Away FC', meta: { location: 'away' } },
      ],
      lineups: [
        {
          id: 1,
          fixture_id: testSmFixtureId,
          player_id: testSmPlayerId,
          team_id: testSmHomeTeamId,
          jersey_number: 9,
          player: { id: testSmPlayerId, name: 'Live Striker' },
          details: [
            { code: 'minutes-played', value: 30 },
            { code: 'goals', value: 1 },
            { code: 'passes-total', value: 15 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snap30m);
    await syncService.syncStatisticsByFixtureId(testSmFixtureId);

    const rows30 = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testPlayer.id],
    );
    expect(rows30).toHaveLength(1);
    expect(rows30[0].minutes_played).toBe(30);
    expect(rows30[0].goals).toBe(1);

    // SNAPSHOT 2 (65th minute): 2 goals, 30 passes (REPLACES snapshot, does not SUM to 3)
    const snap65m: SportmonksFixtureDto = {
      ...snap30m,
      lineups: [
        {
          ...snap30m.lineups![0],
          details: [
            { code: 'minutes-played', value: 65 },
            { code: 'goals', value: 2 }, // Latest total
            { code: 'passes-total', value: 30 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snap65m);
    await syncService.syncStatisticsByFixtureId(testSmFixtureId);

    const rows65 = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testPlayer.id],
    );
    expect(rows65).toHaveLength(1); // EXACTLY 1 row (No duplicate!)
    expect(rows65[0].minutes_played).toBe(65);
    expect(rows65[0].goals).toBe(2); // Updated to 2 (NOT 1 + 2 = 3)

    // SNAPSHOT 3 (Post-match official review correction): 1 goal (after own-goal review)
    const snapCorrected: SportmonksFixtureDto = {
      ...snap30m,
      lineups: [
        {
          ...snap30m.lineups![0],
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'goals', value: 1 }, // Corrected down to 1
            { code: 'passes-total', value: 40 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(snapCorrected);
    await syncService.syncStatisticsByFixtureId(testSmFixtureId);

    const rowsFinal = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 AND "player_id" = $2`,
      [testMatch.id, testPlayer.id],
    );
    expect(rowsFinal).toHaveLength(1);
    expect(rowsFinal[0].minutes_played).toBe(90);
    expect(rowsFinal[0].goals).toBe(1); // Corrected down to 1

    // Demonstrate Season Aggregation Invariance: SUM(goals) across matches produces exactly 1 goal
    const sumResult = await AppDataSource.query(
      `SELECT SUM(goals)::int as total_goals FROM "player_match_statistics" WHERE "player_id" = $1`,
      [testPlayer.id],
    );
    expect(sumResult[0].total_goals).toBe(1);
  });
});
