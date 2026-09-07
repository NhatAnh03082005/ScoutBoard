import AppDataSource from '../data-source';
import { TypeOrmPlayerWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { TypeOrmPlayerPositionWriteRepository } from '../../modules/players/infrastructure/persistence/typeorm/repositories/typeorm-player-position-write.repository';
import { PersistPlayerPositionsUseCase } from '../../modules/players/application/use-cases/persist-player-positions.use-case';
import { PersistPlayerUseCase } from '../../modules/players/application/use-cases/persist-player.use-case';
import { PlayerOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from '../../modules/players/infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { TransformedPlayer } from '../../modules/external-football/domain/models/transformed-player.model';

describe('Player Positions Persistence Integration Test (Live DB)', () => {
  let playerWriteRepo: TypeOrmPlayerWriteRepository;
  let posWriteRepo: TypeOrmPlayerPositionWriteRepository;
  let persistPlayerUseCase: PersistPlayerUseCase;
  let persistPlayerPositionsUseCase: PersistPlayerPositionsUseCase;

  let testPlayer: PlayerOrmEntity;

  const testProvider = 'FOOTBALL_DATA_ORG';
  const testPlayerExtId = `pos-test-player-${Date.now()}`;

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
      name: 'Position Test Player',
      normalizedName: 'position test player',
      shortName: 'Test Player',
      dateOfBirth: '1998-01-01',
      nationality: 'England',
      heightCm: 185,
      weightKg: 78,
      primaryPosition: 'CB',
      shirtNumber: 4,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    };

    testPlayer = await persistPlayerUseCase.execute(playerInput, null);
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

  it('TC-14: should persist a new player position with internal Player UUID', async () => {
    const result = await persistPlayerPositionsUseCase.execute({
      playerExternalId: testPlayerExtId,
      externalProvider: testProvider,
      positionCode: 'CB',
      isPrimary: true,
    });

    expect(result.playerId).toBe(testPlayer.id);
    expect(result.positionCode).toBe('CB');
    expect(result.isPrimary).toBe(true);

    // Direct SQL check
    const rows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1 AND "position_code" = $2`,
      [testPlayer.id, 'CB'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].player_id).toBe(testPlayer.id);
    expect(rows[0].is_primary).toBe(true);
  });

  it('TC-15: should handle duplicate persistence idempotently (COUNT = 1)', async () => {
    await persistPlayerPositionsUseCase.execute({
      playerExternalId: testPlayerExtId,
      externalProvider: testProvider,
      positionCode: 'CB',
      isPrimary: true,
    });

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_positions" WHERE "player_id" = $1 AND "position_code" = $2`,
      [testPlayer.id, 'CB'],
    );
    expect(countRows[0].count).toBe(1);
  });

  it('TC-16: should allow multiple different positions for the same player', async () => {
    await persistPlayerPositionsUseCase.execute({
      playerId: testPlayer.id,
      positionCode: 'LB',
      isPrimary: false,
    });

    const countRows = await AppDataSource.query(
      `SELECT COUNT(*)::int as count FROM "player_positions" WHERE "player_id" = $1`,
      [testPlayer.id],
    );
    expect(countRows[0].count).toBe(2);
  });

  it('TC-17: should throw error when external player identity is not found', async () => {
    await expect(
      persistPlayerPositionsUseCase.execute({
        playerExternalId: 'non-existent-player-999999',
        externalProvider: testProvider,
        positionCode: 'ST',
      }),
    ).rejects.toThrow();
  });

  it('TC-18: should enforce single-primary invariant when switching primary position', async () => {
    // Switch primary to LB
    await persistPlayerPositionsUseCase.execute({
      playerId: testPlayer.id,
      positionCode: 'LB',
      isPrimary: true,
    });

    const primaryRows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1 AND "is_primary" = true`,
      [testPlayer.id],
    );
    expect(primaryRows).toHaveLength(1);
    expect(primaryRows[0].position_code).toBe('LB');

    // Previous CB should now be secondary (is_primary = false)
    const cbRows = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1 AND "position_code" = 'CB'`,
      [testPlayer.id],
    );
    expect(cbRows[0].is_primary).toBe(false);
  });

  it('TC-19: should cascade delete player positions when player is deleted', async () => {
    // Create temporary player for deletion test
    const tempExtId = `temp-del-${Date.now()}`;
    const tempPlayer = await persistPlayerUseCase.execute({
      externalProvider: testProvider,
      externalId: tempExtId,
      name: 'Temp Deletion Player',
      normalizedName: 'temp deletion player',
      shortName: 'Temp Player',
      dateOfBirth: '2000-01-01',
      nationality: 'England',
      heightCm: 180,
      weightKg: 75,
      primaryPosition: 'ST',
      shirtNumber: 9,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
    });

    await persistPlayerPositionsUseCase.execute({
      playerId: tempPlayer.id,
      positionCode: 'ST',
      isPrimary: true,
    });

    // Delete the player
    await AppDataSource.getRepository(PlayerOrmEntity).delete({ id: tempPlayer.id });

    // Verify player_positions rows were cascaded
    const orphanPositions = await AppDataSource.query(
      `SELECT * FROM "player_positions" WHERE "player_id" = $1`,
      [tempPlayer.id],
    );
    expect(orphanPositions).toHaveLength(0);
  });
});
