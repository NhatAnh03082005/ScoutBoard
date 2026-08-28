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

describe('PlayerMatchStatisticsSync (Live PostgreSQL Integration)', () => {
  let syncService: PlayerMatchStatisticsSyncService;
  let mockSportmonksClient: any;

  let testComp: CompetitionOrmEntity;
  let testSeason: SeasonOrmEntity;
  let testHomeTeam: TeamOrmEntity;
  let testAwayTeam: TeamOrmEntity;
  let testMatch: MatchOrmEntity;
  let testOutfieldPlayer: PlayerOrmEntity;
  let testGkPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const prefix = `sync-e2e-${Date.now()}`;
  const testSmFixtureId = Math.floor(Math.random() * 10000000) + 2000000;
  const testSmHomeId = Math.floor(Math.random() * 100000) + 40000;
  const testSmAwayId = Math.floor(Math.random() * 100000) + 50000;
  const testSmOutfieldPlayerId = Math.floor(Math.random() * 100000) + 60000;
  const testSmGkPlayerId = Math.floor(Math.random() * 100000) + 70000;

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
        name: 'Sync E2E League',
        code: 'SE2EL',
        type: 'LEAGUE',
      }),
    );

    testSeason = await seasonRepo.save(
      seasonRepo.create({
        competitionId: testComp.id,
        externalProvider: testProvider,
        externalId: `${prefix}-season`,
        name: 'Sync E2E Season 2026',
        code: 'SE2E_2026',
        startDate: '2026-08-01',
        endDate: '2027-05-30',
        currentMatchday: 1,
        isCurrent: true,
      }),
    );

    testHomeTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmHomeId),
        name: 'Sync Home FC',
        normalizedName: 'sync home fc',
      }),
    );

    testAwayTeam = await teamRepo.save(
      teamRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmAwayId),
        name: 'Sync Away FC',
        normalizedName: 'sync away fc',
      }),
    );

    testOutfieldPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmOutfieldPlayerId),
        name: 'Sync Striker',
        normalizedName: 'sync striker',
        shirtNumber: 9,
        currentTeamId: testHomeTeam.id,
      }),
    );

    testGkPlayer = await playerRepo.save(
      playerRepo.create({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmGkPlayerId),
        name: 'Sync Keeper',
        normalizedName: 'sync keeper',
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
      await AppDataSource.getRepository(PlayerMatchStatisticOrmEntity).delete({
        matchId: testMatch?.id,
      });
      await AppDataSource.getRepository(ExternalMatchMappingOrmEntity).delete({
        externalProvider: 'SPORTMONKS',
        externalId: String(testSmFixtureId),
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testOutfieldPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        id: testGkPlayer?.id,
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

  it('should execute complete end-to-end sync: fetch -> reconcile -> resolve -> map -> persist', async () => {
    const fixtureDto: SportmonksFixtureDto = {
      id: testSmFixtureId,
      name: 'Sync Home FC vs Sync Away FC',
      starting_at: '2026-08-22 19:00:00',
      participants: [
        { id: testSmHomeId, name: 'Sync Home FC', meta: { location: 'home' } },
        { id: testSmAwayId, name: 'Sync Away FC', meta: { location: 'away' } },
      ],
      lineups: [
        {
          id: 101,
          fixture_id: testSmFixtureId,
          player_id: testSmOutfieldPlayerId,
          team_id: testSmHomeId,
          position_id: 27,
          jersey_number: 9,
          player: { id: testSmOutfieldPlayerId, name: 'Sync Striker' },
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'goals', value: 2 },
            { code: 'shots-total', value: 4 },
            { code: 'passes-total', value: 30 },
            { code: 'passes-accurate', value: 26 },
          ],
        },
        {
          id: 102,
          fixture_id: testSmFixtureId,
          player_id: testSmGkPlayerId,
          team_id: testSmAwayId,
          position_id: 24,
          jersey_number: 1,
          player: { id: testSmGkPlayerId, name: 'Sync Keeper' },
          details: [
            { code: 'minutes-played', value: 90 },
            { code: 'saves', value: 3 },
            { code: 'goals-conceded', value: 2 },
            { code: 'cleansheets', value: 0 },
          ],
        },
      ],
    };

    mockSportmonksClient.getFixtureById.mockResolvedValueOnce(fixtureDto);

    const result = await syncService.syncStatisticsByFixtureId(testSmFixtureId);

    expect(result.status).toBe('MATCHED');
    expect(result.matchId).toBe(testMatch.id);
    expect(result.persisted).toBe(2);
    expect(result.unresolvedPlayers).toBe(0);

    // Verify persisted rows in PostgreSQL
    const stats = await AppDataSource.query(
      `SELECT * FROM "player_match_statistics" WHERE "match_id" = $1 ORDER BY "goals" DESC`,
      [testMatch.id],
    );

    expect(stats).toHaveLength(2);
    expect(stats[0].player_id).toBe(testOutfieldPlayer.id);
    expect(stats[0].goals).toBe(2);
    expect(stats[0].saves).toBeNull(); // Strict NULL GK field

    expect(stats[1].player_id).toBe(testGkPlayer.id);
    expect(stats[1].saves).toBe(3);
    expect(stats[1].goals_conceded).toBe(2);

    // Verify mapping was cached in PostgreSQL
    const mapping = await AppDataSource.query(
      `SELECT * FROM "external_match_mappings" WHERE "external_provider" = 'SPORTMONKS' AND "external_id" = $1`,
      [String(testSmFixtureId)],
    );
    expect(mapping).toHaveLength(1);
    expect(mapping[0].match_id).toBe(testMatch.id);
  });
});
