import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintOnMatchAndProvider1789450000000
  implements MigrationInterface
{
  name = 'AddUniqueConstraintOnMatchAndProvider1789450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "external_match_mappings"
      ADD CONSTRAINT "UQ_ext_match_mappings_match_provider" UNIQUE ("match_id", "external_provider");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "external_match_mappings"
      DROP CONSTRAINT IF EXISTS "UQ_ext_match_mappings_match_provider";
    `);
  }
}
