import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRedundantProviderExternalIdIndexes1789900000000 implements MigrationInterface {
  name = 'DropRedundantProviderExternalIdIndexes1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_competitions_provider_external_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_matches_provider_external_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_players_provider_external_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_teams_provider_external_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_competitions_provider_external_id"
      ON "competitions" ("external_provider", "external_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_matches_provider_external_id"
      ON "matches" ("external_provider", "external_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_players_provider_external_id"
      ON "players" ("external_provider", "external_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_teams_provider_external_id"
      ON "teams" ("external_provider", "external_id");
    `);
  }
}
