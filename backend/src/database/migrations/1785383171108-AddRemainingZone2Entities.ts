import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemainingZone2Entities1785383171108 implements MigrationInterface {
  name = 'AddRemainingZone2Entities1785383171108';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "player_team_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "player_id" uuid NOT NULL, "team_id" uuid NOT NULL, "start_date" date, "end_date" date, "shirt_number" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4fcf9cd8c9c36db784be411dbff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_team_history_team_id" ON "player_team_history" ("team_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_team_history_player_id" ON "player_team_history" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "competition_id" uuid NOT NULL, "season_id" uuid NOT NULL, "home_team_id" uuid NOT NULL, "away_team_id" uuid NOT NULL, "external_provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "match_date" TIMESTAMP WITH TIME ZONE, "status" character varying(30) NOT NULL DEFAULT 'FINISHED', "home_score" integer, "away_score" integer, "data_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_matches_provider_external_id" UNIQUE ("external_provider", "external_id"), CONSTRAINT "PK_8a22c7b2e0828988d51256117f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_competition_season" ON "matches" ("competition_id", "season_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_matches_provider_external_id" ON "matches" ("external_provider", "external_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player_match_statistics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "match_id" uuid NOT NULL, "player_id" uuid NOT NULL, "team_id" uuid NOT NULL, "minutes_played" integer NOT NULL DEFAULT '0', "is_starter" boolean NOT NULL DEFAULT false, "rating" numeric(3,1), "goals" integer NOT NULL DEFAULT '0', "assists" integer NOT NULL DEFAULT '0', "shots" integer NOT NULL DEFAULT '0', "key_passes" integer NOT NULL DEFAULT '0', "tackles" integer NOT NULL DEFAULT '0', "interceptions" integer NOT NULL DEFAULT '0', "yellow_cards" integer NOT NULL DEFAULT '0', "red_cards" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_player_match_stats_composite" UNIQUE ("match_id", "player_id"), CONSTRAINT "PK_31d64848ef8644ed45897ec55d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_match_stats_player_id" ON "player_match_statistics" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_match_stats_match_id" ON "player_match_statistics" ("match_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" ADD CONSTRAINT "FK_6718d122f4edf2f52421d8c11f6" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" ADD CONSTRAINT "FK_7c37895964aa8abdaa37b36416f" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_dc604f895a134adedbbf5bf405d" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_7d7e5cc65ab15d4c9a6139d7c24" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_bb25f11ea6fa78b344a68923769" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_e457f057d971e464c1ebf6378c5" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" ADD CONSTRAINT "FK_e82852d3f0edbdf1c018702c5de" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" ADD CONSTRAINT "FK_b412048d4c9d053fc4b4b1a2e2d" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" ADD CONSTRAINT "FK_32992bdf19a46ad173b66db8641" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" DROP CONSTRAINT "FK_32992bdf19a46ad173b66db8641"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" DROP CONSTRAINT "FK_b412048d4c9d053fc4b4b1a2e2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" DROP CONSTRAINT "FK_e82852d3f0edbdf1c018702c5de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_e457f057d971e464c1ebf6378c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_bb25f11ea6fa78b344a68923769"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_7d7e5cc65ab15d4c9a6139d7c24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT "FK_dc604f895a134adedbbf5bf405d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" DROP CONSTRAINT "FK_7c37895964aa8abdaa37b36416f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" DROP CONSTRAINT "FK_6718d122f4edf2f52421d8c11f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_match_stats_match_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_match_stats_player_id"`,
    );
    await queryRunner.query(`DROP TABLE "player_match_statistics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_matches_provider_external_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_matches_competition_season"`,
    );
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_team_history_player_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_team_history_team_id"`,
    );
    await queryRunner.query(`DROP TABLE "player_team_history"`);
  }
}
