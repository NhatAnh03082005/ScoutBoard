import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSquadsTable1789200000000 implements MigrationInterface {
  name = 'CreateSquadsTable1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "squads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "season_id" uuid,
        "name" character varying(150) NOT NULL,
        "formation_code" character varying(30) NOT NULL,
        "description" text,
        "visibility" character varying(30) NOT NULL DEFAULT 'PRIVATE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_squads" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_squads_owner" ON "squads" ("owner_id", "updated_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_squads_season_id" ON "squads" ("season_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "squads" ADD CONSTRAINT "FK_squads_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "squads" ADD CONSTRAINT "FK_squads_season_id" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "squads" DROP CONSTRAINT "FK_squads_season_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "squads" DROP CONSTRAINT "FK_squads_owner_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_squads_season_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_squads_owner"`);
    await queryRunner.query(`DROP TABLE "squads"`);
  }
}
