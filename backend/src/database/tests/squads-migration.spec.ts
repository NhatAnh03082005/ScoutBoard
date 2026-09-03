import { QueryRunner } from 'typeorm';
import { CreateSquadsTable1789200000000 } from '../migrations/1789200000000-CreateSquadsTable';
import AppDataSource from '../data-source';

describe('CreateSquadsTable1789200000000 (Migration)', () => {
  let migration: CreateSquadsTable1789200000000;
  let mockQueryRunner: jest.Mocked<Partial<QueryRunner>>;

  beforeEach(() => {
    migration = new CreateSquadsTable1789200000000();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue([]),
    };
  });

  describe('Unit: Migration Query Runner calls', () => {
    it('should execute CREATE TABLE, CREATE INDEXes, and ADD CONSTRAINTs on up', async () => {
      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(5);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE "squads"'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('CREATE INDEX "idx_squads_owner" ON "squads" ("owner_id", "updated_at" DESC)'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('CREATE INDEX "IDX_squads_season_id" ON "squads" ("season_id")'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('ALTER TABLE "squads" ADD CONSTRAINT "FK_squads_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining('ALTER TABLE "squads" ADD CONSTRAINT "FK_squads_season_id" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL'),
      );
    });

    it('should drop constraints, indexes, and table on down', async () => {
      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(5);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "squads" DROP CONSTRAINT "FK_squads_season_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        'ALTER TABLE "squads" DROP CONSTRAINT "FK_squads_owner_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        'DROP INDEX "public"."IDX_squads_season_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        4,
        'DROP INDEX "public"."idx_squads_owner"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        5,
        'DROP TABLE "squads"',
      );
    });
  });

  describe('Integration / Live DB Verification (TC-01 through TC-09)', () => {
    let testUserId: string;
    let testSeasonId: string;

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
      // 1. Create a test user for foreign key verification
      const userRes = await AppDataSource.query(
        `INSERT INTO "users" ("email", "password_hash", "full_name") VALUES ($1, $2, $3) RETURNING "id"`,
        [`test-squad-owner-${Date.now()}-${Math.random()}@example.com`, 'hash', 'Test Squad Owner'],
      );
      testUserId = userRes[0].id;

      // 2. Fetch or create a test season for season_id FK verification
      const existingSeasons = await AppDataSource.query(`SELECT "id" FROM "seasons" LIMIT 1`);
      if (existingSeasons.length > 0) {
        testSeasonId = existingSeasons[0].id;
      } else {
        const compRes = await AppDataSource.query(
          `INSERT INTO "competitions" ("name", "country", "external_provider", "external_id") VALUES ($1, $2, $3, $4) RETURNING "id"`,
          ['Test Competition', 'England', 'API_FOOTBALL', `TC_${Date.now()}`],
        );
        const seasonRes = await AppDataSource.query(
          `INSERT INTO "seasons" ("competition_id", "name", "season_code", "start_date", "end_date", "is_current", "external_provider", "external_id") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING "id"`,
          [compRes[0].id, '2025/2026', '2025-2026', '2025-08-01', '2026-05-31', true, 'API_FOOTBALL', `TS_${Date.now()}`],
        );
        testSeasonId = seasonRes[0].id;
      }

    });

    afterEach(async () => {
      // Clean up test user (cascade deletes squads)
      if (testUserId) {
        await AppDataSource.query(`DELETE FROM "users" WHERE "id" = $1`, [testUserId]);
      }
    });

    it('TC-01 & TC-02: should verify table columns, types, nullability, and defaults', async () => {
      const columns = await AppDataSource.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'squads' 
         ORDER BY ordinal_position`,
      );

      const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

      expect(colMap.has('id')).toBe(true);
      expect((colMap.get('id') as any).data_type).toBe('uuid');
      expect((colMap.get('id') as any).is_nullable).toBe('NO');

      expect(colMap.has('owner_id')).toBe(true);
      expect((colMap.get('owner_id') as any).data_type).toBe('uuid');
      expect((colMap.get('owner_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('season_id')).toBe(true);
      expect((colMap.get('season_id') as any).data_type).toBe('uuid');
      expect((colMap.get('season_id') as any).is_nullable).toBe('YES');

      expect(colMap.has('name')).toBe(true);
      expect((colMap.get('name') as any).data_type).toBe('character varying');
      expect((colMap.get('name') as any).is_nullable).toBe('NO');

      expect(colMap.has('formation_code')).toBe(true);
      expect((colMap.get('formation_code') as any).data_type).toBe('character varying');
      expect((colMap.get('formation_code') as any).is_nullable).toBe('NO');

      expect(colMap.has('description')).toBe(true);
      expect((colMap.get('description') as any).data_type).toBe('text');
      expect((colMap.get('description') as any).is_nullable).toBe('YES');

      expect(colMap.has('visibility')).toBe(true);
      expect((colMap.get('visibility') as any).data_type).toBe('character varying');
      expect((colMap.get('visibility') as any).is_nullable).toBe('NO');
      expect((colMap.get('visibility') as any).column_default).toContain('PRIVATE');

      expect(colMap.has('created_at')).toBe(true);
      expect((colMap.get('created_at') as any).data_type).toBe('timestamp with time zone');
      expect((colMap.get('created_at') as any).is_nullable).toBe('NO');

      expect(colMap.has('updated_at')).toBe(true);
      expect((colMap.get('updated_at') as any).data_type).toBe('timestamp with time zone');
      expect((colMap.get('updated_at') as any).is_nullable).toBe('NO');
    });

    it('TC-03: Primary Key constraint - duplicate id should be rejected', async () => {
      const fixedId = 'b0000000-0000-0000-0000-000000000001';
      await AppDataSource.query(
        `INSERT INTO "squads" ("id", "owner_id", "name", "formation_code") VALUES ($1, $2, $3, $4)`,
        [fixedId, testUserId, 'Squad 1', '4-3-3'],
      );

      await expect(
        AppDataSource.query(
          `INSERT INTO "squads" ("id", "owner_id", "name", "formation_code") VALUES ($1, $2, $3, $4)`,
          [fixedId, testUserId, 'Squad Duplicate', '4-3-3'],
        ),
      ).rejects.toThrow();
    });

    it('TC-04: Owner Foreign Key constraint - non-existent owner_id should be rejected', async () => {
      const nonExistentOwnerId = '99999999-9999-9999-9999-999999999999';

      await expect(
        AppDataSource.query(
          `INSERT INTO "squads" ("owner_id", "name", "formation_code") VALUES ($1, $2, $3)`,
          [nonExistentOwnerId, 'Invalid Owner Squad', '4-3-3'],
        ),
      ).rejects.toThrow(/FK_squads_owner_id|foreign key constraint/i);
    });

    it('TC-05: Season Foreign Key constraint - valid season_id can be inserted', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "season_id", "name", "formation_code") VALUES ($1, $2, $3, $4) RETURNING "id", "season_id"`,
        [testUserId, testSeasonId, 'Season Squad', '4-2-3-1'],
      );

      expect(res[0].id).toBeDefined();
      expect(res[0].season_id).toBe(testSeasonId);
    });

    it('TC-06: Nullable Season - season_id = NULL should be valid', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "season_id", "name", "formation_code") VALUES ($1, $2, $3, $4) RETURNING "id", "season_id"`,
        [testUserId, null, 'Free Squad Without Season', '3-5-2'],
      );

      expect(res[0].id).toBeDefined();
      expect(res[0].season_id).toBeNull();
    });

    it('TC-07: Default Visibility - should default to PRIVATE when omitted', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "name", "formation_code") VALUES ($1, $2, $3) RETURNING "visibility"`,
        [testUserId, 'Default Visibility Squad', '4-4-2'],
      );

      expect(res[0].visibility).toBe('PRIVATE');
    });

    it('TC-08: Timestamps - created_at and updated_at should default to current time', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "squads" ("owner_id", "name", "formation_code") VALUES ($1, $2, $3) RETURNING "created_at", "updated_at"`,
        [testUserId, 'Timestamps Squad Test', '3-4-3'],
      );

      expect(res[0].created_at).toBeDefined();
      expect(res[0].updated_at).toBeDefined();
      expect(new Date(res[0].created_at).getTime()).toBeLessThanOrEqual(Date.now() + 5000);
      expect(new Date(res[0].updated_at).getTime()).toBeLessThanOrEqual(Date.now() + 5000);
    });

    it('TC-09: Indexes - idx_squads_owner and IDX_squads_season_id must exist', async () => {
      const indexes = await AppDataSource.query(
        `SELECT indexname, indexdef 
         FROM pg_indexes 
         WHERE tablename = 'squads'`,
      );

      const indexNames = indexes.map((i: any) => i.indexname);
      expect(indexNames).toContain('idx_squads_owner');
      expect(indexNames).toContain('IDX_squads_season_id');

      const ownerIdx = indexes.find((i: any) => i.indexname === 'idx_squads_owner');
      expect(ownerIdx.indexdef).toContain('owner_id');
      expect(ownerIdx.indexdef).toContain('updated_at');
    });
  });
});
