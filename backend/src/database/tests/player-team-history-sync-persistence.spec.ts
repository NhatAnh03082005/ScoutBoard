import AppDataSource from '../data-source';
import { TypeOrmPlayerWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TypeOrmPlayerTeamHistoryWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-team-history-write.repository';
import { PersistPlayerUseCase } from '../../modules/players/application/use-cases/persist-player.use-case';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { PersistPlayerTeamHistoryUseCase } from '../../modules/players/application/use-cases/persist-player-team-history.use-case';
import { PlayerTeamHistorySyncService } from '../../modules/players/application/services/player-team-history-sync.service';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';

describe('Player Team History Sync and Persistence Integration Test (Live DB)', () => {
  let playerWriteRepo: TypeOrmPlayerWriteRepository;
  let teamWriteRepo: TypeOrmTeamWriteRepository;
  let historyWriteRepo: TypeOrmPlayerTeamHistoryWriteRepository;
  let persistPlayerUseCase: PersistPlayerUseCase;
  let persistTeamUseCase: PersistTeamUseCase;
  let persistPlayerTeamHistoryUseCase: PersistPlayerTeamHistoryUseCase;
  let playerTeamHistorySyncService: PlayerTeamHistorySyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  let testPlayer: PlayerOrmEntity;
  let testTeam1: TeamOrmEntity;
  let testTeam2: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testPlayerExtId = `sync-hist-p-${Date.now()}`;
  const testTeamExtId1 = `sync-hist-t1-${Date.now()}`;
  const testTeamExtId2 = `sync-hist-t2-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const playerOrmRepo = AppDataSource.getRepository(PlayerOrmEntity);
    const teamOrmRepo = AppDataSource.getRepository(TeamOrmEntity);
    const historyOrmRepo = AppDataSource.getRepository(PlayerTeamHistoryOrmEntity);

    playerWriteRepo = new TypeOrmPlayerWriteRepository(playerOrmRepo);
    teamWriteRepo = new TypeOrmTeamWriteRepository(teamOrmRepo);
    historyWriteRepo = new TypeOrmPlayerTeamHistoryWriteRepository(
      historyOrmRepo,
      playerOrmRepo,
    );

    persistPlayerUseCase = new PersistPlayerUseCase(playerWriteRepo);
    persistTeamUseCase = new PersistTeamUseCase(teamWriteRepo);
    persistPlayerTeamHistoryUseCase = new PersistPlayerTeamHistoryUseCase(
      historyWriteRepo,
      playerWriteRepo,
      teamWriteRepo,
    );

    testPlayer = await persistPlayerUseCase.execute({
      externalProvider: testProvider,
      externalId: testPlayerExtId,
      name: 'Sync History Test Player',
      normalizedName: 'sync history test player',
      shortName: 'Sync History Player',
      dateOfBirth: '1985-02-05',
      nationality: 'Portugal',
      heightCm: 187,
      weightKg: 83,
      preferredFoot: 'Right',
      primaryPosition: 'ST',
      shirtNumber: 7,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    testTeam1 = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testTeamExtId1,
      name: 'Sync History Team 1',
      normalizedName: 'sync history team 1',
      shortName: 'Team 1',
      tla: 'SH1',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1902,
      clubColors: 'White',
      venue: 'Stadium 1',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    testTeam2 = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testTeamExtId2,
      name: 'Sync History Team 2',
      normalizedName: 'sync history team 2',
      shortName: 'Team 2',
      tla: 'SH2',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1878,
      clubColors: 'Red',
      venue: 'Stadium 2',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    mockApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn(),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn().mockResolvedValue({
        id: testPlayerExtId as any,
        name: 'Sync History Test Player',
        shirtNumber: 7,
        currentTeam: {
          id: testTeamExtId2 as any,
          name: 'Sync History Team 2',
          contract: {
            start: '2021-08-01',
            until: '2023-06-30',
          },
        },
      }),
      getPlayerMatches: jest.fn().mockResolvedValue({
        count: 2,
        matches: [
          {
            id: 101,
            utcDate: '2015-05-10T18:00:00Z',
            homeTeam: { id: testTeamExtId1 as any, name: 'Sync History Team 1' },
            awayTeam: { id: 'opponent-team', name: 'Opponent' },
          },
          {
            id: 102,
            utcDate: '2021-09-01T15:00:00Z',
            homeTeam: { id: testTeamExtId2 as any, name: 'Sync History Team 2' },
            awayTeam: { id: 'opponent-team-2', name: 'Opponent 2' },
          },
        ],
      }),
    } as any;

    playerTeamHistorySyncService = new PlayerTeamHistorySyncService(
      mockApiClient,
      persistPlayerTeamHistoryUseCase,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerTeamHistoryOrmEntity).delete({
        playerId: testPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testPlayerExtId,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testTeamExtId1,
      });
      await AppDataSource.getRepository(TeamOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testTeamExtId2,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-21: should sync player career history and persist into PostgreSQL', async () => {
    const syncResult = await playerTeamHistorySyncService.syncPlayerTeamHistoryById(
      testPlayerExtId,
      testProvider,
    );

    expect(syncResult.externalPlayerId).toBe(testPlayerExtId);
    expect(syncResult.totalDerivedTeams).toBe(2);

    const rows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 ORDER BY "start_date" ASC`,
      [testPlayer.id],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].team_id).toBe(testTeam1.id);
    expect(rows[0].is_current).toBe(false);
    expect(rows[1].team_id).toBe(testTeam2.id);
    expect(rows[1].is_current).toBe(true);
  });

  it('TC-22: should maintain idempotency on repeated sync without duplicate records', async () => {
    await playerTeamHistorySyncService.syncPlayerTeamHistoryById(
      testPlayerExtId,
      testProvider,
    );
    await playerTeamHistorySyncService.syncPlayerTeamHistoryById(
      testPlayerExtId,
      testProvider,
    );

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_team_history" WHERE "player_id" = $1`,
      [testPlayer.id],
    );
    expect(countRows[0].count).toBe(2);
  });

  it('TC-23: should enforce single-current invariant on current team', async () => {
    const currentRows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 AND "is_current" = true`,
      [testPlayer.id],
    );
    expect(currentRows).toHaveLength(1);
    expect(currentRows[0].team_id).toBe(testTeam2.id);

    const playerRows = await AppDataSource.query(
      `SELECT "current_team_id" FROM "players" WHERE "id" = $1`,
      [testPlayer.id],
    );
    expect(playerRows[0].current_team_id).toBe(testTeam2.id);
  });

  it('TC-24: should accurately store start_date, end_date, and shirt_number for multiple teams', async () => {
    const rows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 ORDER BY "start_date" ASC`,
      [testPlayer.id],
    );

    // Team 1 (Historical)
    expect(rows[0].start_date).not.toBeNull();
    expect(rows[0].end_date).not.toBeNull();
    expect(rows[0].is_current).toBe(false);

    // Team 2 (Current)
    expect(rows[1].start_date).not.toBeNull();
    expect(rows[1].end_date).toBeNull();
    expect(rows[1].is_current).toBe(true);
    expect(rows[1].shirt_number).toBe(7);
  });

  it('TC-25: should reject syncing when player does not exist in DB and avoid creating orphan rows', async () => {
    mockApiClient.getPlayerById.mockResolvedValueOnce({
      id: 999999 as any,
      name: 'Ghost Player',
      currentTeam: { id: testTeamExtId1 as any },
    });

    await expect(
      playerTeamHistorySyncService.syncPlayerTeamHistoryById('999999', testProvider),
    ).rejects.toThrow();

    const orphanRows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" NOT IN (SELECT "id" FROM "players")`,
    );
    expect(orphanRows).toHaveLength(0);
  });
});
