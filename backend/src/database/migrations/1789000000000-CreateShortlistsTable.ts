import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShortlistsTable1789000000000 implements MigrationInterface {
  name = 'CreateShortlistsTable1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shortlists" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" text,
        "visibility" character varying(30) NOT NULL DEFAULT 'PRIVATE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shortlists" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_shortlists_owner" ON "shortlists" ("owner_id", "updated_at" DESC)`,
    );

    await queryRunner.query(
      `ALTER TABLE "shortlists" ADD CONSTRAINT "FK_shortlists_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shortlists" DROP CONSTRAINT "FK_shortlists_owner_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_shortlists_owner"`);
    await queryRunner.query(`DROP TABLE "shortlists"`);
  }
}
