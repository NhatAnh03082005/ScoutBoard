import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeasonTeamsTable1785700000000 implements MigrationInterface {
  name = 'CreateSeasonTeamsTable1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "season_teams" ("season_id" uuid NOT NULL, "team_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_season_teams" PRIMARY KEY ("season_id", "team_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_season_teams_team_id" ON "season_teams" ("team_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_teams" ADD CONSTRAINT "FK_season_teams_season_id" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_teams" ADD CONSTRAINT "FK_season_teams_team_id" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "season_teams" DROP CONSTRAINT "FK_season_teams_team_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "season_teams" DROP CONSTRAINT "FK_season_teams_season_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_season_teams_team_id"`);
    await queryRunner.query(`DROP TABLE "season_teams"`);
  }
}
