import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradePassingStatistics1785383500000
  implements MigrationInterface
{
  name = 'UpgradePassingStatistics1785383500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Upgrade player_match_statistics
    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      ADD COLUMN "passes_attempted" integer NOT NULL DEFAULT 0,
      ADD COLUMN "passes_completed" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      ADD CONSTRAINT "CHK_pms_passes_attempted_gte_0" CHECK ("passes_attempted" >= 0),
      ADD CONSTRAINT "CHK_pms_passes_completed_gte_0" CHECK ("passes_completed" >= 0),
      ADD CONSTRAINT "CHK_pms_passes_completed_lte_attempted" CHECK ("passes_completed" <= "passes_attempted");
    `);

    // Drop legacy passes column from player_match_statistics if it exists
    const hasPmsPasses = await queryRunner.hasColumn(
      'player_match_statistics',
      'passes',
    );
    if (hasPmsPasses) {
      await queryRunner.query(`
        ALTER TABLE "player_match_statistics" DROP COLUMN "passes";
      `);
    }

    // 2. Upgrade player_season_statistics
    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      ADD COLUMN "passes_attempted" integer NOT NULL DEFAULT 0,
      ADD COLUMN "passes_completed" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      ADD CONSTRAINT "CHK_pss_passes_attempted_gte_0" CHECK ("passes_attempted" >= 0),
      ADD CONSTRAINT "CHK_pss_passes_completed_gte_0" CHECK ("passes_completed" >= 0),
      ADD CONSTRAINT "CHK_pss_passes_completed_lte_attempted" CHECK ("passes_completed" <= "passes_attempted");
    `);

    // Drop legacy columns from player_season_statistics if they exist
    const hasPssPasses = await queryRunner.hasColumn(
      'player_season_statistics',
      'passes',
    );
    if (hasPssPasses) {
      await queryRunner.query(`
        ALTER TABLE "player_season_statistics" DROP COLUMN "passes";
      `);
    }

    const hasPssAccuracy = await queryRunner.hasColumn(
      'player_season_statistics',
      'pass_accuracy',
    );
    if (hasPssAccuracy) {
      await queryRunner.query(`
        ALTER TABLE "player_season_statistics" DROP COLUMN "pass_accuracy";
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert player_season_statistics
    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      ADD COLUMN "passes" integer NOT NULL DEFAULT 0,
      ADD COLUMN "pass_accuracy" numeric(5, 2);
    `);

    await queryRunner.query(`
      ALTER TABLE "player_season_statistics"
      DROP CONSTRAINT "CHK_pss_passes_completed_lte_attempted",
      DROP CONSTRAINT "CHK_pss_passes_completed_gte_0",
      DROP CONSTRAINT "CHK_pss_passes_attempted_gte_0",
      DROP COLUMN "passes_completed",
      DROP COLUMN "passes_attempted";
    `);

    // Revert player_match_statistics
    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      ADD COLUMN "passes" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "player_match_statistics"
      DROP CONSTRAINT "CHK_pms_passes_completed_lte_attempted",
      DROP CONSTRAINT "CHK_pms_passes_completed_gte_0",
      DROP CONSTRAINT "CHK_pms_passes_attempted_gte_0",
      DROP COLUMN "passes_completed",
      DROP COLUMN "passes_attempted";
    `);
  }
}
