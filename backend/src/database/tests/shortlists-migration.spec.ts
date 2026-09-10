import { QueryRunner } from 'typeorm';
import { CreateShortlistsTable1789000000000 } from '../migrations/1789000000000-CreateShortlistsTable';
import AppDataSource from '../data-source';

describe('CreateShortlistsTable1789000000000 (Migration)', () => {
  let migration: CreateShortlistsTable1789000000000;
  let mockQueryRunner: jest.Mocked<Partial<QueryRunner>>;

  beforeEach(() => {
    migration = new CreateShortlistsTable1789000000000();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue([]),
    };
  });

  describe('Unit: Migration Query Runner calls', () => {
    it('should execute CREATE TABLE, CREATE INDEX, and ADD CONSTRAINT on up', async () => {
      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE "shortlists"'),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(
          'CREATE INDEX "idx_shortlists_owner" ON "shortlists" ("owner_id", "updated_at" DESC)',
        ),
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          'ALTER TABLE "shortlists" ADD CONSTRAINT "FK_shortlists_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE',
        ),
      );
    });

    it('should drop constraint, index, and table on down', async () => {
      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.query).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        1,
        'ALTER TABLE "shortlists" DROP CONSTRAINT "FK_shortlists_owner_id"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        2,
        'DROP INDEX "public"."idx_shortlists_owner"',
      );
      expect(mockQueryRunner.query).toHaveBeenNthCalledWith(
        3,
        'DROP TABLE "shortlists"',
      );
    });
  });

  describe('Integration / Live DB Verification (TC-01 through TC-08)', () => {
    let testUserId: string;

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
      // Create a test user for foreign key verification
      const userRes = await AppDataSource.query(
        `INSERT INTO "users" ("email", "password_hash", "full_name") VALUES ($1, $2, $3) RETURNING "id"`,
        [
          `test-owner-${Date.now()}-${Math.random()}@example.com`,
          'hash',
          'Test Owner',
        ],
      );
      testUserId = userRes[0].id;
    });

    afterEach(async () => {
      // Clean up test user (will cascade delete shortlists if any remain)
      if (testUserId) {
        await AppDataSource.query(`DELETE FROM "users" WHERE "id" = $1`, [
          testUserId,
        ]);
      }
    });

    it('TC-01 & TC-02: should verify table columns, types, nullability, and defaults', async () => {
      const columns = await AppDataSource.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'shortlists' 
         ORDER BY ordinal_position`,
      );

      const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

      expect(colMap.has('id')).toBe(true);
      expect((colMap.get('id') as any).data_type).toBe('uuid');
      expect((colMap.get('id') as any).is_nullable).toBe('NO');

      expect(colMap.has('owner_id')).toBe(true);
      expect((colMap.get('owner_id') as any).data_type).toBe('uuid');
      expect((colMap.get('owner_id') as any).is_nullable).toBe('NO');

      expect(colMap.has('name')).toBe(true);
      expect((colMap.get('name') as any).data_type).toBe('character varying');
      expect((colMap.get('name') as any).is_nullable).toBe('NO');

      expect(colMap.has('description')).toBe(true);
      expect((colMap.get('description') as any).data_type).toBe('text');
      expect((colMap.get('description') as any).is_nullable).toBe('YES');

      expect(colMap.has('visibility')).toBe(true);
      expect((colMap.get('visibility') as any).data_type).toBe(
        'character varying',
      );
      expect((colMap.get('visibility') as any).is_nullable).toBe('NO');
      expect((colMap.get('visibility') as any).column_default).toContain(
        'PRIVATE',
      );

      expect(colMap.has('created_at')).toBe(true);
      expect((colMap.get('created_at') as any).data_type).toBe(
        'timestamp with time zone',
      );
      expect((colMap.get('created_at') as any).is_nullable).toBe('NO');

      expect(colMap.has('updated_at')).toBe(true);
      expect((colMap.get('updated_at') as any).data_type).toBe(
        'timestamp with time zone',
      );
      expect((colMap.get('updated_at') as any).is_nullable).toBe('NO');
    });

    it('TC-03: Primary Key constraint - duplicate id should be rejected', async () => {
      const fixedId = 'a0000000-0000-0000-0000-000000000001';
      await AppDataSource.query(
        `INSERT INTO "shortlists" ("id", "owner_id", "name") VALUES ($1, $2, $3)`,
        [fixedId, testUserId, 'Shortlist 1'],
      );

      await expect(
        AppDataSource.query(
          `INSERT INTO "shortlists" ("id", "owner_id", "name") VALUES ($1, $2, $3)`,
          [fixedId, testUserId, 'Shortlist Duplicate'],
        ),
      ).rejects.toThrow();
    });

    it('TC-04: Owner Foreign Key constraint - non-existent owner_id should be rejected', async () => {
      const nonExistentOwnerId = '99999999-9999-9999-9999-999999999999';

      await expect(
        AppDataSource.query(
          `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2)`,
          [nonExistentOwnerId, 'Invalid Owner Shortlist'],
        ),
      ).rejects.toThrow(/FK_shortlists_owner_id|foreign key constraint/i);
    });

    it('TC-05: Cascade Delete - deleting user should automatically delete their shortlists', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2) RETURNING "id"`,
        [testUserId, 'Target for Cascade Delete'],
      );
      const shortlistId = res[0].id;

      // Delete user
      await AppDataSource.query(`DELETE FROM "users" WHERE "id" = $1`, [
        testUserId,
      ]);

      // Check shortlist is deleted
      const check = await AppDataSource.query(
        `SELECT * FROM "shortlists" WHERE "id" = $1`,
        [shortlistId],
      );
      expect(check.length).toBe(0);
      testUserId = ''; // Prevent cleanup error
    });

    it('TC-06: Visibility Default - should default to PRIVATE if omitted', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2) RETURNING "visibility"`,
        [testUserId, 'Default Visibility Test'],
      );

      expect(res[0].visibility).toBe('PRIVATE');
    });

    it('TC-07: Timestamps - created_at and updated_at should default to current time', async () => {
      const res = await AppDataSource.query(
        `INSERT INTO "shortlists" ("owner_id", "name") VALUES ($1, $2) RETURNING "created_at", "updated_at"`,
        [testUserId, 'Timestamps Test'],
      );

      expect(res[0].created_at).toBeDefined();
      expect(res[0].updated_at).toBeDefined();
      expect(new Date(res[0].created_at).getTime()).toBeLessThanOrEqual(
        Date.now() + 5000,
      );
      expect(new Date(res[0].updated_at).getTime()).toBeLessThanOrEqual(
        Date.now() + 5000,
      );
    });

    it('TC-08: Owner Index - idx_shortlists_owner(owner_id, updated_at DESC) must exist', async () => {
      const indexInfo = await AppDataSource.query(
        `SELECT indexname, indexdef 
         FROM pg_indexes 
         WHERE tablename = 'shortlists' AND indexname = 'idx_shortlists_owner'`,
      );

      expect(indexInfo.length).toBe(1);
      expect(indexInfo[0].indexdef).toContain('owner_id');
      expect(indexInfo[0].indexdef).toContain('updated_at');
    });
  });
});
