import { QueryRunner } from 'typeorm';
import { CreateShortlistPlayersTable1789100000000 } from '../migrations/1789100000000-CreateShortlistPlayersTable';
import AppDataSource from '../data-source';

describe('CreateShortlistPlayersTable1789100000000 (Migration)', () => {
  let migration: CreateShortlistPlayersTable1789100000000;
  let mockQueryRunner: jest.Mocked<Partial<QueryRunner>>;

  beforeEach(() => {
    migration = new CreateShortlistPlayersTable1789100000000();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue([]),
    };
  });

  describe('Unit: Migration Query Runner calls', () => {
    it('should execute CREATE TABLE, CREATE INDEXES, and ADD CONSTRAINTS on up', async () => {
      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(5);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE "shortlist_players"'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(
          'CREATE INDEX "IDX_shortlist_players_shortlist_id"',
        ),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          'CREATE INDEX "IDX_shortlist_players_player_id"',
        ),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining(
          'ALTER TABLE "shortlist_players" ADD CONSTRAINT "FK_shortlist_players_shortlist_id" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE',
        ),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining(
          'ALTER TABLE "shortlist_players" ADD CONSTRAINT "FK_shortlist_players_player_id" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE',
        ),
      );
    });

    it('should drop constraints, indexes, and table on down', async () => {
      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(5);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "shortlist_players" DROP CONSTRAINT "FK_shortlist_players_player_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        'ALTER TABLE "shortlist_players" DROP CONSTRAINT "FK_shortlist_players_shortlist_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        'DROP INDEX "public"."IDX_shortlist_players_player_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        'DROP INDEX "public"."IDX_shortlist_players_shortlist_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        'DROP TABLE "shortlist_players"',
      );
    });
  });

  describe('Integration / Live DB Verification (TC-01 through TC-08)', () => {
    let testUserId: string;
    let testShortlistId1: string;
    let testShortlistId2: string;
    let testPlayerId1: string;
    let testPlayerId2: string;

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
        [
          `test-owner-${Date.now()}-${Math.random()}@example.com`,
          'hash',
          'Test Owner',
        ],
      );
      testUserId = userRes[0].id;

      // 2. Create 2 test shortlists
      const slRes1 = await AppDataSource.query(
        `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2) RETURNING "id"`,
        [testUserId, 'Shortlist 1'],
      );
      testShortlistId1 = slRes1[0].id;

      const slRes2 = await AppDataSource.query(
        `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2) RETURNING "id"`,
        [testUserId, 'Shortlist 2'],
      );
      testShortlistId2 = slRes2[0].id;

      // 3. Create 2 test players
      const playerRes1 = await AppDataSource.query(
        `INSERT INTO "players" ("external_provider", "external_id", "name", "primary_position") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [
          'manual_test',
          `p1-${Date.now()}-${Math.random()}`,
          'Test Player 1',
          'RW',
        ],
      );
      testPlayerId1 = playerRes1[0].id;

      const playerRes2 = await AppDataSource.query(
        `INSERT INTO "players" ("external_provider", "external_id", "name", "primary_position") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [
          'manual_test',
          `p2-${Date.now()}-${Math.random()}`,
          'Test Player 2',
          'LW',
        ],
      );
      testPlayerId2 = playerRes2[0].id;
    });

    afterEach(async () => {
      // Clean up test data
      if (testUserId) {
        await AppDataSource.query(`DELETE FROM "users" WHERE "id" = $1`, [
          testUserId,
        ]);
      }
      if (testPlayerId1) {
        await AppDataSource.query(`DELETE FROM "players" WHERE "id" = $1`, [
          testPlayerId1,
        ]);
      }
      if (testPlayerId2) {
        await AppDataSource.query(`DELETE FROM "players" WHERE "id" = $1`, [
          testPlayerId2,
        ]);
      }
    });

    it('TC-01: should verify shortlist_players table structure and columns', async () => {
      const columns = await AppDataSource.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'shortlist_players' 
         ORDER BY ordinal_position`,
      );

      const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

      expect(colMap.has('id')).toBe(true);
      expect((colMap.get('id') as any).data_type).toBe('uuid');
      expect((colMap.get('id') as any).is_nullable).toBe('NO');

      expect(colMap.has('shortlist_id')).toBe(true);
      expect((colMap.get('shortlist_id') as any).data_type).toBe('uuid');
      expect((colMap.get('shortlist_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('player_id')).toBe(true);
      expect((colMap.get('player_id') as any).data_type).toBe('uuid');
      expect((colMap.get('player_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('note')).toBe(true);
      expect((colMap.get('note') as any).data_type).toBe('text');
      expect((colMap.get('note') as any).is_nullable).toBe('YES');

      expect(colMap.has('added_at')).toBe(true);
      expect((colMap.get('added_at') as any).data_type).toBe(
        'timestamp with time zone',
      );
      expect((colMap.get('added_at') as any).is_nullable).toBe('NO');
    });

    it('TC-02: Foreign Key to Shortlist - non-existent shortlist_id must be rejected', async () => {
      const nonExistentShortlistId = '99999999-9999-9999-9999-999999999999';

      await expect(
        AppDataSource.query(
          `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2)`,
          [nonExistentShortlistId, testPlayerId1],
        ),
      ).rejects.toThrow(
        /FK_shortlist_players_shortlist_id|foreign key constraint/i,
      );
    });

    it('TC-03: Foreign Key to Player - non-existent player_id must be rejected', async () => {
      const nonExistentPlayerId = '99999999-9999-9999-9999-999999999999';

      await expect(
        AppDataSource.query(
          `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2)`,
          [testShortlistId1, nonExistentPlayerId],
        ),
      ).rejects.toThrow(
        /FK_shortlist_players_player_id|foreign key constraint/i,
      );
    });

    it('TC-04: Duplicate Player in Same Shortlist - should fail due to unique constraint', async () => {
      await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2)`,
        [testShortlistId1, testPlayerId1],
      );

      await expect(
        AppDataSource.query(
          `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2)`,
          [testShortlistId1, testPlayerId1],
        ),
      ).rejects.toThrow(
        /UQ_shortlist_players_shortlist_player|unique constraint/i,
      );
    });

    it('TC-05: Same Player in Different Shortlists - both inserts must succeed', async () => {
      const row1 = await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id", "note") VALUES ($1, $2, $3) RETURNING "id"`,
        [testShortlistId1, testPlayerId1, 'Target in Shortlist 1'],
      );

      const row2 = await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id", "note") VALUES ($1, $2, $3) RETURNING "id"`,
        [testShortlistId2, testPlayerId1, 'Target in Shortlist 2'],
      );

      expect(row1[0].id).toBeDefined();
      expect(row2[0].id).toBeDefined();
      expect(row1[0].id).not.toEqual(row2[0].id);
    });

    it('TC-06: Cascade from Shortlist - deleting shortlist should automatically delete related shortlist_players', async () => {
      const row = await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2) RETURNING "id"`,
        [testShortlistId1, testPlayerId1],
      );
      const shortlistPlayerId = row[0].id;

      // Delete the shortlist
      await AppDataSource.query(`DELETE FROM "shortlists" WHERE "id" = $1`, [
        testShortlistId1,
      ]);

      // Check shortlist_players row is cascade deleted
      const check = await AppDataSource.query(
        `SELECT * FROM "shortlist_players" WHERE "id" = $1`,
        [shortlistPlayerId],
      );
      expect(check.length).toBe(0);
    });

    it('TC-07: Cascade from Player - deleting player should automatically delete related shortlist_players', async () => {
      const row = await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2) RETURNING "id"`,
        [testShortlistId2, testPlayerId2],
      );
      const shortlistPlayerId = row[0].id;

      // Delete the player
      await AppDataSource.query(`DELETE FROM "players" WHERE "id" = $1`, [
        testPlayerId2,
      ]);
      testPlayerId2 = ''; // Avoid cleanup error

      // Check shortlist_players row is cascade deleted
      const check = await AppDataSource.query(
        `SELECT * FROM "shortlist_players" WHERE "id" = $1`,
        [shortlistPlayerId],
      );
      expect(check.length).toBe(0);
    });

    it('TC-08: added_at - should default to current time when omitted', async () => {
      const row = await AppDataSource.query(
        `INSERT INTO "shortlist_players" ("shortlist_id", "player_id") VALUES ($1, $2) RETURNING "added_at"`,
        [testShortlistId1, testPlayerId2],
      );

      expect(row[0].added_at).toBeDefined();
      expect(new Date(row[0].added_at).getTime()).toBeLessThanOrEqual(
        Date.now() + 5000,
      );
    });
  });
});
