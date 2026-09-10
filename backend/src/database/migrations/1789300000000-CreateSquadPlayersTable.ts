import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSquadPlayersTable1789300000000 implements MigrationInterface {
  name = 'CreateSquadPlayersTable1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "squad_players" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "squad_id" uuid NOT NULL,
        "player_id" uuid NOT NULL,
        "slot_code" character varying(30),
        "role" character varying(30) NOT NULL,
        "is_captain" boolean NOT NULL DEFAULT false,
        "display_order" integer,
        "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_squad_players_squad_player" UNIQUE ("squad_id", "player_id"),
        CONSTRAINT "PK_squad_players" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_squad_players_squad_id" ON "squad_players" ("squad_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_squad_players_player_id" ON "squad_players" ("player_id")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_squad_starter_slot" ON "squad_players" ("squad_id", "slot_code") WHERE role = 'STARTER'`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_squad_captain" ON "squad_players" ("squad_id") WHERE is_captain = TRUE`,
    );

    await queryRunner.query(
      `ALTER TABLE "squad_players" ADD CONSTRAINT "FK_squad_players_squad_id" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "squad_players" ADD CONSTRAINT "FK_squad_players_player_id" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "squad_players" DROP CONSTRAINT "FK_squad_players_player_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "squad_players" DROP CONSTRAINT "FK_squad_players_squad_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_squad_captain"`);
    await queryRunner.query(`DROP INDEX "public"."uq_squad_starter_slot"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_squad_players_player_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_squad_players_squad_id"`);
    await queryRunner.query(`DROP TABLE "squad_players"`);
  }
}
