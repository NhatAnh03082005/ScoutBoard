import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExternalMatchMappingsTable1789400000000
  implements MigrationInterface
{
  name = 'CreateExternalMatchMappingsTable1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_match_mappings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_id" uuid NOT NULL,
        "external_provider" character varying(50) NOT NULL,
        "external_id" character varying(100) NOT NULL,
        "confidence" numeric(3,2) NOT NULL DEFAULT 1.00,
        "status" character varying(30) NOT NULL DEFAULT 'CONFIRMED',
        "metadata" jsonb DEFAULT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_external_match_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ext_match_mappings_provider_id" UNIQUE ("external_provider", "external_id"),
        CONSTRAINT "FK_ext_match_mappings_match_id" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ext_match_mappings_match_provider" 
      ON "external_match_mappings" ("match_id", "external_provider");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "external_match_mappings"`);
  }
}
