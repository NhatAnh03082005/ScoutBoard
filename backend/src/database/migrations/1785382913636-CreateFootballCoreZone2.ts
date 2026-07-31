import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFootballCoreZone21785382913636 implements MigrationInterface {
  name = 'CreateFootballCoreZone21785382913636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_failed_login_attempts_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_lockout_count_non_negative"`,
    );
    await queryRunner.query(
      `CREATE TABLE "competitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "country" character varying(100), "type" character varying(30), "logo_url" text, "data_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_competitions_provider_external_id" UNIQUE ("external_provider", "external_id"), CONSTRAINT "PK_ef273910798c3a542b475e75c7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_competitions_provider_external_id" ON "competitions" ("external_provider", "external_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "seasons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "competition_id" uuid NOT NULL, "external_provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "start_date" date, "end_date" date, "is_current" boolean NOT NULL DEFAULT false, "data_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_seasons_competition_provider_external_id" UNIQUE ("competition_id", "external_provider", "external_id"), CONSTRAINT "PK_cb8ed53b5fe109dcd4a4449ec9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_seasons_competition_id" ON "seasons" ("competition_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player_positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "player_id" uuid NOT NULL, "position_code" character varying(30) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_player_positions_player_code" UNIQUE ("player_id", "position_code"), CONSTRAINT "PK_5b358a4a43b26bbb727bc235d00" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_positions_player_id" ON "player_positions" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player_season_statistics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "player_id" uuid NOT NULL, "season_id" uuid NOT NULL, "competition_id" uuid NOT NULL, "team_id" uuid, "matches_played" integer NOT NULL DEFAULT '0', "starts" integer NOT NULL DEFAULT '0', "minutes_played" integer NOT NULL DEFAULT '0', "goals" integer NOT NULL DEFAULT '0', "assists" integer NOT NULL DEFAULT '0', "shots" integer NOT NULL DEFAULT '0', "shots_on_target" integer NOT NULL DEFAULT '0', "key_passes" integer NOT NULL DEFAULT '0', "passes" integer NOT NULL DEFAULT '0', "pass_accuracy" numeric(5,2), "tackles" integer NOT NULL DEFAULT '0', "interceptions" integer NOT NULL DEFAULT '0', "yellow_cards" integer NOT NULL DEFAULT '0', "red_cards" integer NOT NULL DEFAULT '0', "goals_per_90" numeric(5,2) NOT NULL DEFAULT '0', "assists_per_90" numeric(5,2) NOT NULL DEFAULT '0', "key_passes_per_90" numeric(5,2) NOT NULL DEFAULT '0', "tackles_per_90" numeric(5,2) NOT NULL DEFAULT '0', "interceptions_per_90" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_player_season_stats_composite" UNIQUE ("player_id", "season_id", "competition_id", "team_id"), CONSTRAINT "PK_e756ff3a5eab4189c4c7b37205b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_season_stats_season_comp" ON "player_season_statistics" ("season_id", "competition_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_season_stats_player_id" ON "player_season_statistics" ("player_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "current_team_id" uuid, "external_provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "short_name" character varying(100), "date_of_birth" date, "nationality" character varying(100), "height_cm" integer, "weight_kg" integer, "preferred_foot" character varying(10), "primary_position" character varying(50), "shirt_number" integer, "image_url" text, "status" character varying(30) NOT NULL DEFAULT 'ACTIVE', "data_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_players_provider_external_id" UNIQUE ("external_provider", "external_id"), CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_primary_position" ON "players" ("primary_position") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_name" ON "players" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_players_provider_external_id" ON "players" ("external_provider", "external_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "short_name" character varying(50), "tla" character varying(10), "country" character varying(100), "founded_year" integer, "venue_name" character varying(150), "logo_url" text, "data_updated_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_teams_provider_external_id" UNIQUE ("external_provider", "external_id"), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_teams_provider_external_id" ON "teams" ("external_provider", "external_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "seasons" ADD CONSTRAINT "FK_47b4c52ec141bc0ef8b7106777e" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_positions" ADD CONSTRAINT "FK_1faa76b8b170b6f61095ae16451" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD CONSTRAINT "FK_a9ad83268c9e0a04dc3690ff553" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD CONSTRAINT "FK_3acaa1606f81b836f5bb3d808ef" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD CONSTRAINT "FK_18a6fe7691172b0affb7e9ea492" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD CONSTRAINT "FK_d6b0affbda3eb04f419820d7e54" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD CONSTRAINT "FK_46e2fc9256254dbb18f91ef341f" FOREIGN KEY ("current_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" DROP CONSTRAINT "FK_46e2fc9256254dbb18f91ef341f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP CONSTRAINT "FK_d6b0affbda3eb04f419820d7e54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP CONSTRAINT "FK_18a6fe7691172b0affb7e9ea492"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP CONSTRAINT "FK_3acaa1606f81b836f5bb3d808ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP CONSTRAINT "FK_a9ad83268c9e0a04dc3690ff553"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_positions" DROP CONSTRAINT "FK_1faa76b8b170b6f61095ae16451"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seasons" DROP CONSTRAINT "FK_47b4c52ec141bc0ef8b7106777e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_teams_provider_external_id"`,
    );
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_players_provider_external_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_players_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_players_primary_position"`,
    );
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_season_stats_player_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_season_stats_season_comp"`,
    );
    await queryRunner.query(`DROP TABLE "player_season_statistics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_positions_player_id"`,
    );
    await queryRunner.query(`DROP TABLE "player_positions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_seasons_competition_id"`);
    await queryRunner.query(`DROP TABLE "seasons"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_competitions_provider_external_id"`,
    );
    await queryRunner.query(`DROP TABLE "competitions"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_lockout_count_non_negative" CHECK ((lockout_count >= 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_failed_login_attempts_non_negative" CHECK ((failed_login_attempts >= 0))`,
    );
  }
}
