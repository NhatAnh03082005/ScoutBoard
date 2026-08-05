import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEntitiesZone1AndZone21785638370482 implements MigrationInterface {
  name = 'UpdateEntitiesZone1AndZone21785638370482';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" ADD "status" character varying(30) NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "seasons" ADD "season_code" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD "duels_won" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" ADD "advanced_statistics" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD "normalized_name" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" ADD "is_current" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" ADD "statistics" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_match_statistics" DROP COLUMN "statistics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_team_history" DROP COLUMN "is_current"`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN "normalized_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP COLUMN "advanced_statistics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_season_statistics" DROP COLUMN "duels_won"`,
    );
    await queryRunner.query(`ALTER TABLE "seasons" DROP COLUMN "season_code"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "status"`);
  }
}
