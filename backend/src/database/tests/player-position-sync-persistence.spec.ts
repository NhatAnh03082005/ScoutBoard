import AppDataSource from '../data-source';
import { TypeOrmPlayerWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { TypeOrmPlayerPositionWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-position-write.repository';
import { PersistPlayerPositionsUseCase } from '../../modules/players/application/use-cases/persist-player-positions.use-case';
import { PersistPlayerUseCase } from '../../modules/players/application/use-cases/persist-player.use-case';
import { PlayerPositionSyncService } from '../../modules/players/application/services/player-position-sync.service';
import { FootballApiClient } from '../../modules/external-football/application/ports/football-api-client.port';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { TransformedPlayer } from '../../modules/external-football/domain/models/transformed-player.model';

describe('Player Position Sync and Persistence Integration Test (Live DB)', () => {
  let playerWriteRepo: TypeOrmPlayerWriteRepository;
  let posWriteRepo: TypeOrmPlayerPositionWriteRepository;
  let persistPlayerUseCase: PersistPlayerUseCase;
  let persistPlayerPositionsUseCase: PersistPlayerPositionsUseCase;
  let playerPositionSyncService: PlayerPositionSyncService;
  let mockApiClient: jest.Mocked<FootballApiClient>;

  let testPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testPlayerExtId = `sync-pos-p-${Date.now()}`;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const playerOrmRepo = AppDataSource.getRepository(PlayerOrmEntity);
    const posOrmRepo = AppDataSource.getRepository(PlayerPositionOrmEntity);

    playerWriteRepo = new TypeOrmPlayerWriteRepository(playerOrmRepo);
    posWriteRepo = new TypeOrmPlayerPositionWriteRepository(posOrmRepo, playerOrmRepo);
    persistPlayerUseCase = new PersistPlayerUseCase(playerWriteRepo);
    persistPlayerPositionsUseCase = new PersistPlayerPositionsUseCase(
      posWriteRepo,
      playerWriteRepo,
    );

    const playerInput: TransformedPlayer = {
      externalProvider: testProvider,
      externalId: testPlayerExtId,
      name: 'Sync Position Player',
      normalizedName: 'sync position player',
      shortName: 'Sync Player',
      dateOfBirth: '1995-05-15',
      nationality: 'Portugal',
      heightCm: 187,
      weightKg: 83,
      preferredFoot: 'Right',
      primaryPosition: 'ST',
      shirtNumber: 7,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    };

    testPlayer = await persistPlayerUseCase.execute(playerInput, null);

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
        name: 'Sync Position Player',
        position: 'Centre-Forward',
      }),
    } as any;

    playerPositionSyncService = new PlayerPositionSyncService(
      mockApiClient,
      persistPlayerPositionsUseCase,
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(PlayerPositionOrmEntity).delete({
        playerId: testPlayer?.id,
      });
      await AppDataSource.getRepository(PlayerOrmEntity).delete({
        externalProvider: testProvider,
        externalId: testPlayerExtId,
      });

      await AppDataSource.destroy();
    }
  });

  it('TC-16: should sync and persist player position into PostgreSQL', async () => {
    const syncResult = await playerPositionSyncService.syncPlayerPositionById(
      testPlayerExtId,
      testProvider,
    );

    expect(syncResult.status).toBe('SYNCED');
    expect(syncResult.playerId).toBe(testPlayer.id);
    expect(syncResult.positionCode).toBe('ST');
    expect(syncResult.isPrimary).toBe(true);

    const rows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1 AND "position_code" = $2`,
      [testPlayer.id, 'ST'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].is_primary).toBe(true);
  });

  it('TC-17: should maintain COUNT = 1 on repeated syncs of the same player position', async () => {
    await playerPositionSyncService.syncPlayerPositionById(
      testPlayerExtId,
      testProvider,
    );
    await playerPositionSyncService.syncPlayerPositionById(
      testPlayerExtId,
      testProvider,
    );

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_positions" WHERE "player_id" = $1 AND "position_code" = $2`,
      [testPlayer.id, 'ST'],
    );
    expect(countRows[0].count).toBe(1);
  });

  it('TC-18: should update primary position to Left Winger and demote previous position to secondary', async () => {
    mockApiClient.getPlayerById.mockResolvedValueOnce({
      id: testPlayerExtId as any,
      name: 'Sync Position Player',
      position: 'Left Winger',
    });

    const result = await playerPositionSyncService.syncPlayerPositionById(
      testPlayerExtId,
      testProvider,
    );

    expect(result.positionCode).toBe('LW');
    expect(result.isPrimary).toBe(true);

    // Verify only ONE primary position exists in DB
    const primaryRows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1 AND "is_primary" = true`,
      [testPlayer.id],
    );
    expect(primaryRows).toHaveLength(1);
    expect(primaryRows[0].position_code).toBe('LW');

    // Verify player.primaryPosition is updated to 'LW'
    const playerRows = await AppDataSource.query(
      `SELECT "primary_position" FROM "players" WHERE "id" = $1`,
      [testPlayer.id],
    );
    expect(playerRows[0].primary_position).toBe('LW');
  });

  it('TC-19: should throw error and create no orphan records when syncing non-existent player', async () => {
    mockApiClient.getPlayerById.mockResolvedValueOnce({
      id: 999999 as any,
      name: 'Ghost Player',
      position: 'Goalkeeper',
    });

    await expect(
      playerPositionSyncService.syncPlayerPositionById('999999', testProvider),
    ).rejects.toThrow();

    const orphanRows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "position_code" = 'GK' AND "player_id" NOT IN (SELECT "id" FROM "players")`,
    );
    expect(orphanRows).toHaveLength(0);
  });

  it('TC-20: should keep existing player and positions intact when position sync encounters error', async () => {
    mockApiClient.getPlayerById.mockRejectedValueOnce(new Error('Network failure'));

    await expect(
      playerPositionSyncService.syncPlayerPositionById(testPlayerExtId, testProvider),
    ).rejects.toThrow('Network failure');

    // Verify player is still intact in DB
    const playerRows = await AppDataSource.query(
      `SELECT * FROM "players" WHERE "id" = $1`,
      [testPlayer.id],
    );
    expect(playerRows).toHaveLength(1);
  });
});
