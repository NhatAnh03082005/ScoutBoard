import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShortlistPlayersTable1789100000000 implements MigrationInterface {
  name = 'CreateShortlistPlayersTable1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "shortlist_players" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shortlist_id" uuid NOT NULL,
        "player_id" uuid NOT NULL,
        "note" text,
        "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shortlist_players_shortlist_player" UNIQUE ("shortlist_id", "player_id"),
        CONSTRAINT "PK_shortlist_players" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_shortlist_players_shortlist_id" ON "shortlist_players" ("shortlist_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_shortlist_players_player_id" ON "shortlist_players" ("player_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "shortlist_players" ADD CONSTRAINT "FK_shortlist_players_shortlist_id" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "shortlist_players" ADD CONSTRAINT "FK_shortlist_players_player_id" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shortlist_players" DROP CONSTRAINT "FK_shortlist_players_player_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shortlist_players" DROP CONSTRAINT "FK_shortlist_players_shortlist_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_shortlist_players_player_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_shortlist_players_shortlist_id"`,
    );
    await queryRunner.query(`DROP TABLE "shortlist_players"`);
  }
}
