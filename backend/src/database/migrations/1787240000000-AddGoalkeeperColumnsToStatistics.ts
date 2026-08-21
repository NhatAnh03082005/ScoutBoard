import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoalkeeperColumnsToStatistics1787240000000
  implements MigrationInterface
{
  name = 'AddGoalkeeperColumnsToStatistics1787240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add goalkeeper columns to player_match_statistics (nullable)
    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      ADD COLUMN IF NOT EXISTS "saves" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "goals_conceded" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "clean_sheets" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "penalties_saved" integer DEFAULT NULL;
    `);

    // 2. Add goalkeeper columns to player_season_statistics (nullable)
    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      ADD COLUMN IF NOT EXISTS "saves" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "goals_conceded" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "clean_sheets" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "penalties_saved" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "penalties_faced" integer DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "saves_per_90" numeric(5,2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "goals_conceded_per_90" numeric(5,2) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "save_percentage" numeric(5,2) DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert player_season_statistics goalkeeper columns
    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      DROP COLUMN IF EXISTS "save_percentage",
      DROP COLUMN IF EXISTS "goals_conceded_per_90",
      DROP COLUMN IF EXISTS "saves_per_90",
      DROP COLUMN IF EXISTS "penalties_faced",
      DROP COLUMN IF EXISTS "penalties_saved",
      DROP COLUMN IF EXISTS "clean_sheets",
      DROP COLUMN IF EXISTS "goals_conceded",
      DROP COLUMN IF EXISTS "saves";
    `);

    // 2. Revert player_match_statistics goalkeeper columns
    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      DROP COLUMN IF EXISTS "penalties_saved",
      DROP COLUMN IF EXISTS "clean_sheets",
      DROP COLUMN IF EXISTS "goals_conceded",
      DROP COLUMN IF EXISTS "saves";
    `);
  }
}
