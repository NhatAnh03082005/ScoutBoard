import AppDataSource from '../data-source';
import { TypeOrmPlayerWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { TypeOrmTeamWriteRepository } from '../../modules/teams/infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TypeOrmPlayerTeamHistoryWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-team-history-write.repository';
import { PersistPlayerUseCase } from '../../modules/players/application/use-cases/persist-player.use-case';
import { PersistTeamUseCase } from '../../modules/teams/application/use-cases/persist-team.use-case';
import { PersistPlayerTeamHistoryUseCase } from '../../modules/players/application/use-cases/persist-player-team-history.use-case';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../../modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerTeamHistoryOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';

describe('Player Team History Persistence Integration Test (Live DB)', () => {
  let playerWriteRepo: TypeOrmPlayerWriteRepository;
  let teamWriteRepo: TypeOrmTeamWriteRepository;
  let historyWriteRepo: TypeOrmPlayerTeamHistoryWriteRepository;
  let persistPlayerUseCase: PersistPlayerUseCase;
  let persistTeamUseCase: PersistTeamUseCase;
  let persistPlayerTeamHistoryUseCase: PersistPlayerTeamHistoryUseCase;

  let testPlayer: PlayerOrmEntity;
  let testTeam1: TeamOrmEntity;
  let testTeam2: TeamOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testPlayerExtId = `history-p-${Date.now()}`;
  const testTeamExtId1 = `history-t1-${Date.now()}`;
  const testTeamExtId2 = `history-t2-${Date.now()}`;

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

    // Create test player
    testPlayer = await persistPlayerUseCase.execute({
      externalProvider: testProvider,
      externalId: testPlayerExtId,
      name: 'History Test Player',
      normalizedName: 'history test player',
      shortName: 'Test Player',
      dateOfBirth: '1992-06-24',
      nationality: 'Argentina',
      heightCm: 170,
      weightKg: 72,
      preferredFoot: 'Left',
      primaryPosition: 'RW',
      shirtNumber: 10,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    // Create test teams
    testTeam1 = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testTeamExtId1,
      name: 'History Test Team 1',
      normalizedName: 'history test team 1',
      shortName: 'Team 1',
      tla: 'HT1',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1900,
      clubColors: 'Blue / Red',
      venue: 'Stadium 1',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    testTeam2 = await persistTeamUseCase.execute({
      externalProvider: testProvider,
      externalId: testTeamExtId2,
      name: 'History Test Team 2',
      normalizedName: 'history test team 2',
      shortName: 'Team 2',
      tla: 'HT2',
      crestUrl: null,
      address: null,
      website: null,
      founded: 1970,
      clubColors: 'Blue / White',
      venue: 'Stadium 2',
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });
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

  it('TC-18: should persist a new player team history with internal Player UUID and Team UUID', async () => {
    const result = await persistPlayerTeamHistoryUseCase.execute({
      playerExternalId: testPlayerExtId,
      teamExternalId: testTeamExtId1,
      externalProvider: testProvider,
      startDate: '2015-01-01',
      endDate: '2021-06-30',
      shirtNumber: 10,
      isCurrent: false,
    });

    expect(result.playerId).toBe(testPlayer.id);
    expect(result.teamId).toBe(testTeam1.id);
    expect(result.startDate).toBe('2015-01-01');
    expect(result.endDate).toBe('2021-06-30');
    expect(result.isCurrent).toBe(false);

    // Direct SQL check
    const rows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 AND "team_id" = $2`,
      [testPlayer.id, testTeam1.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].player_id).toBe(testPlayer.id);
    expect(rows[0].team_id).toBe(testTeam1.id);
  });

  it('TC-19: should update existing history idempotently (COUNT = 1)', async () => {
    await persistPlayerTeamHistoryUseCase.execute({
      playerExternalId: testPlayerExtId,
      teamExternalId: testTeamExtId1,
      externalProvider: testProvider,
      startDate: '2015-01-01',
      endDate: '2021-08-01',
      shirtNumber: 10,
      isCurrent: false,
    });

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_team_history" WHERE "player_id" = $1 AND "team_id" = $2`,
      [testPlayer.id, testTeam1.id],
    );
    expect(countRows[0].count).toBe(1);
  });

  it('TC-20: should allow multiple different teams for the same player', async () => {
    await persistPlayerTeamHistoryUseCase.execute({
      playerExternalId: testPlayerExtId,
      teamExternalId: testTeamExtId2,
      externalProvider: testProvider,
      startDate: '2021-08-10',
      endDate: null,
      shirtNumber: 30,
      isCurrent: true,
    });

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_team_history" WHERE "player_id" = $1`,
      [testPlayer.id],
    );
    expect(countRows[0].count).toBe(2);
  });

  it('TC-21 & TC-22: should reject non-existent player or team external identity', async () => {
    await expect(
      persistPlayerTeamHistoryUseCase.execute({
        playerExternalId: 'non-existent-player-999999',
        teamExternalId: testTeamExtId1,
        externalProvider: testProvider,
      }),
    ).rejects.toThrow();

    await expect(
      persistPlayerTeamHistoryUseCase.execute({
        playerExternalId: testPlayerExtId,
        teamExternalId: 'non-existent-team-999999',
        externalProvider: testProvider,
      }),
    ).rejects.toThrow();
  });

  it('TC-23: should enforce single-current invariant and synchronize players.current_team_id', async () => {
    // Switch current team back to team 1
    await persistPlayerTeamHistoryUseCase.execute({
      playerId: testPlayer.id,
      teamId: testTeam1.id,
      startDate: '2024-01-01',
      endDate: null,
      shirtNumber: 10,
      isCurrent: true,
    });

    // Check only ONE record has is_current = true
    const currentRows = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 AND "is_current" = true`,
      [testPlayer.id],
    );
    expect(currentRows).toHaveLength(1);
    expect(currentRows[0].team_id).toBe(testTeam1.id);

    // Verify player.current_team_id is updated to testTeam1.id
    const playerRows = await AppDataSource.query(
      `SELECT "current_team_id" FROM "players" WHERE "id" = $1`,
      [testPlayer.id],
    );
    expect(playerRows[0].current_team_id).toBe(testTeam1.id);
  });

  it('TC-24: should support multiple distinct spells at the same team with distinct startDate', async () => {
    const team1Spells = await AppDataSource.query(
      `SELECT * FROM "player_team_history" WHERE "player_id" = $1 AND "team_id" = $2 ORDER BY "start_date" ASC`,
      [testPlayer.id, testTeam1.id],
    );

    expect(team1Spells.length).toBeGreaterThanOrEqual(2);
  });
});
