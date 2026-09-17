import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexPlayerMatchStatsMinutes1789800000000 implements MigrationInterface {
  name = 'AddIndexPlayerMatchStatsMinutes1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "idx_pms_player_minutes"
      ON "player_match_statistics" ("player_id", "minutes_played");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."idx_pms_player_minutes";
    `);
  }
}
