import { QueryRunner } from 'typeorm';
import { CreateSquadPlayersTable1789300000000 } from '../migrations/1789300000000-CreateSquadPlayersTable';
import AppDataSource from '../data-source';

describe('CreateSquadPlayersTable1789300000000 (Migration)', () => {
  let migration: CreateSquadPlayersTable1789300000000;
  let mockQueryRunner: jest.Mocked<Partial<QueryRunner>>;

  beforeEach(() => {
    migration = new CreateSquadPlayersTable1789300000000();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue([]),
    };
  });

  describe('Unit: Migration Query Runner calls', () => {
    it('TC-01: should execute CREATE TABLE, INDEXes, UNIQUE INDEXes and FK CONSTRAINTs on up', async () => {
      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(7);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE "squad_players"'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CREATE INDEX "IDX_squad_players_squad_id" ON "squad_players" ("squad_id")'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('CREATE INDEX "IDX_squad_players_player_id" ON "squad_players" ("player_id")'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('CREATE UNIQUE INDEX "uq_squad_starter_slot" ON "squad_players" ("squad_id", "slot_code") WHERE role = \'STARTER\''),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('CREATE UNIQUE INDEX "uq_squad_captain" ON "squad_players" ("squad_id") WHERE is_captain = TRUE'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        6,
        expect.stringContaining('ALTER TABLE "squad_players" ADD CONSTRAINT "FK_squad_players_squad_id" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        7,
        expect.stringContaining('ALTER TABLE "squad_players" ADD CONSTRAINT "FK_squad_players_player_id" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE'),
      );
    });

    it('TC-02: should drop constraints, indexes, and table on down', async () => {
      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(7);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "squad_players" DROP CONSTRAINT "FK_squad_players_player_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        'ALTER TABLE "squad_players" DROP CONSTRAINT "FK_squad_players_squad_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        'DROP INDEX "public"."uq_squad_captain"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        'DROP INDEX "public"."uq_squad_starter_slot"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        'DROP INDEX "public"."IDX_squad_players_player_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        6,
        'DROP INDEX "public"."IDX_squad_players_squad_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        7,
        'DROP TABLE "squad_players"',
      );
    });
  });

  describe('Integration / Live DB Verification (TC-03 through TC-10)', () => {
    let testUserId: string;
    let testSquad1Id: string;
    let testSquad2Id: string;
    let testPlayer1Id: string;
    let testPlayer2Id: string;
    let testPlayer3Id: string;

    beforeAll(async () => {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
    });

    afterAll(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    });

    beforeEach(async () => {
      // 1. Create a test user
      const userRes = await AppDataSource.query(
        `INSERT INTO "users" ("email", "password_hash", "full_name") VALUES ($1, $2, $3) RETURNING "id"`,
        [`test-squad-player-owner-${Date.now()}-${Math.random()}@example.com`, 'hash', 'Test Squad Player Owner'],
      );
      testUserId = userRes[0].id;

      // 2. Create 2 test squads for this user
      const squad1Res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "name", "formation_code") VALUES ($1, $2, $3) RETURNING "id"`,
        [testUserId, 'Test Squad Alpha', '4-3-3'],
      );
      testSquad1Id = squad1Res[0].id;

      const squad2Res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "name", "formation_code") VALUES ($1, $2, $3) RETURNING "id"`,
        [testUserId, 'Test Squad Beta', '4-2-3-1'],
      );
      testSquad2Id = squad2Res[0].id;

      // 3. Create 3 test players
      const player1Res = await AppDataSource.query(
        `INSERT INTO "players" ("external_provider", "external_id", "name", "primary_position") 
         VALUES ($1, $2, $3, $4) RETURNING "id"`,
        ['manual_test', `p1-${Date.now()}-${Math.random()}`, 'Test Player 1', 'GK'],
      );
      testPlayer1Id = player1Res[0].id;

      const player2Res = await AppDataSource.query(
        `INSERT INTO "players" ("external_provider", "external_id", "name", "primary_position") 
         VALUES ($1, $2, $3, $4) RETURNING "id"`,
        ['manual_test', `p2-${Date.now()}-${Math.random()}`, 'Test Player 2', 'CB'],
      );
      testPlayer2Id = player2Res[0].id;

      const player3Res = await AppDataSource.query(
        `INSERT INTO "players" ("external_provider", "external_id", "name", "primary_position") 
         VALUES ($1, $2, $3, $4) RETURNING "id"`,
        ['manual_test', `p3-${Date.now()}-${Math.random()}`, 'Test Player 3', 'ST'],
      );
      testPlayer3Id = player3Res[0].id;
    });

    afterEach(async () => {
      // Clean up test user & players
      if (testUserId) {
        await AppDataSource.query(`DELETE FROM "users" WHERE "id" = $1`, [testUserId]);
      }
      const playerIds = [testPlayer1Id, testPlayer2Id, testPlayer3Id].filter(Boolean);
      if (playerIds.length > 0) {
        await AppDataSource.query(`DELETE FROM "players" WHERE "id" = ANY($1)`, [playerIds]);
      }
    });

    it('TC-01: Table Columns, Types, and Defaults verification', async () => {
      const columns = await AppDataSource.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'squad_players' 
         ORDER BY ordinal_position`,
      );

      const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

      expect(colMap.has('id')).toBe(true);
      expect((colMap.get('id') as any).data_type).toBe('uuid');
      expect((colMap.get('id') as any).is_nullable).toBe('NO');

      expect(colMap.has('squad_id')).toBe(true);
      expect((colMap.get('squad_id') as any).data_type).toBe('uuid');
      expect((colMap.get('squad_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('player_id')).toBe(true);
      expect((colMap.get('player_id') as any).data_type).toBe('uuid');
      expect((colMap.get('player_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('slot_code')).toBe(true);
      expect((colMap.get('slot_code') as any).data_type).toBe('character varying');
      expect((colMap.get('slot_code') as any).is_nullable).toBe('YES');

      expect(colMap.has('role')).toBe(true);
      expect((colMap.get('role') as any).data_type).toBe('character varying');
      expect((colMap.get('role') as any).is_nullable).toBe('NO');

      expect(colMap.has('is_captain')).toBe(true);
      expect((colMap.get('is_captain') as any).data_type).toBe('boolean');
      expect((colMap.get('is_captain') as any).is_nullable).toBe('NO');
      expect((colMap.get('is_captain') as any).column_default).toContain('false');

      expect(colMap.has('display_order')).toBe(true);
      expect((colMap.get('display_order') as any).data_type).toBe('integer');
      expect((colMap.get('display_order') as any).is_nullable).toBe('YES');

      expect(colMap.has('added_at')).toBe(true);
      expect((colMap.get('added_at') as any).data_type).toBe('timestamp with time zone');
      expect((colMap.get('added_at') as any).is_nullable).toBe('NO');
    });

    it('TC-03: Duplicate player in the same squad should be rejected', async () => {
      // First insert player1 in squad1
      await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4)`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER'],
      );

      // Second insert of same player1 in squad1 should fail
      await expect(
        AppDataSource.query(
          `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4)`,
          [testSquad1Id, testPlayer1Id, 'SUB-1', 'SUBSTITUTE'],
        ),
      ).rejects.toThrow(/UQ_squad_players_squad_player|unique constraint/i);
    });

    it('TC-04: Same player in different squads should be allowed', async () => {
      const res1 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER'],
      );

      const res2 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad2Id, testPlayer1Id, 'GK', 'STARTER'],
      );

      expect(res1[0].id).toBeDefined();
      expect(res2[0].id).toBeDefined();
      expect(res1[0].id).not.toBe(res2[0].id);
    });

    it('TC-05: Duplicate starter slot in the same squad should be rejected', async () => {
      // Player 1 as GK starter
      await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4)`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER'],
      );

      // Player 2 also assigned as GK starter in the same squad -> must fail
      await expect(
        AppDataSource.query(
          `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4)`,
          [testSquad1Id, testPlayer2Id, 'GK', 'STARTER'],
        ),
      ).rejects.toThrow(/uq_squad_starter_slot|unique constraint/i);
    });

    it('TC-06: Different starter slots should be allowed', async () => {
      const res1 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER'],
      );

      const res2 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad1Id, testPlayer2Id, 'CB-1', 'STARTER'],
      );

      expect(res1[0].id).toBeDefined();
      expect(res2[0].id).toBeDefined();
    });

    it('TC-07: Multiple substitutes with NULL or same slot_code should be allowed', async () => {
      const res1 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role", "display_order") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
        [testSquad1Id, testPlayer1Id, null, 'SUBSTITUTE', 1],
      );

      const res2 = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role", "display_order") VALUES ($1, $2, $3, $4, $5) RETURNING "id"`,
        [testSquad1Id, testPlayer2Id, null, 'SUBSTITUTE', 2],
      );

      expect(res1[0].id).toBeDefined();
      expect(res2[0].id).toBeDefined();
    });

    it('TC-08: Multiple captains in the same squad should be rejected', async () => {
      // Player 1 as captain
      await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role", "is_captain") VALUES ($1, $2, $3, $4, $5)`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER', true],
      );

      // Player 2 as another captain in the same squad -> must fail
      await expect(
        AppDataSource.query(
          `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role", "is_captain") VALUES ($1, $2, $3, $4, $5)`,
          [testSquad1Id, testPlayer2Id, 'CB-1', 'STARTER', true],
        ),
      ).rejects.toThrow(/uq_squad_captain|unique constraint/i);
    });

    it('TC-09: Delete squad should cascade delete all related squad_players', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad1Id, testPlayer1Id, 'GK', 'STARTER'],
      );
      const squadPlayerId = res[0].id;

      // Delete squad 1
      await AppDataSource.query(`DELETE FROM "squads" WHERE "id" = $1`, [testSquad1Id]);

      // Check squad_players row is deleted
      const check = await AppDataSource.query(
        `SELECT * FROM "squad_players" WHERE "id" = $1`,
        [squadPlayerId],
      );
      expect(check.length).toBe(0);
    });

    it('TC-10: Delete player should cascade delete their squad_players row', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squad_players" ("squad_id", "player_id", "slot_code", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [testSquad2Id, testPlayer3Id, 'ST', 'STARTER'],
      );
      const squadPlayerId = res[0].id;

      // Delete player 3
      await AppDataSource.query(`DELETE FROM "players" WHERE "id" = $1`, [testPlayer3Id]);
      testPlayer3Id = ''; // Prevent cleanup error

      // Check squad_players row is removed
      const check = await AppDataSource.query(
        `SELECT * FROM "squad_players" WHERE "id" = $1`,
        [squadPlayerId],
      );
      expect(check.length).toBe(0);
    });
  });
});
