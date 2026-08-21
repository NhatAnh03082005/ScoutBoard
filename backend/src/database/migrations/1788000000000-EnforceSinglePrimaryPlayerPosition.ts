import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSinglePrimaryPlayerPosition1788000000000 implements MigrationInterface {
  name = 'EnforceSinglePrimaryPlayerPosition1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keep the denormalized player field when it points to an existing position.
    // Otherwise choose deterministically from the legacy flags and position code.
    await queryRunner.query(`
      INSERT INTO "player_positions" ("player_id", "position_code", "is_primary")
      SELECT p."id", p."primary_position", TRUE
      FROM "players" p
      WHERE p."primary_position" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "player_positions" pp
          WHERE pp."player_id" = p."id"
            AND pp."position_code" = p."primary_position"
        )
    `);

    await queryRunner.query(`
      WITH ranked_positions AS (
        SELECT
          pp.id,
          ROW_NUMBER() OVER (
            PARTITION BY pp.player_id
            ORDER BY
              (pp.position_code = p.primary_position) DESC,
              pp.is_primary DESC,
              pp.position_code ASC,
              pp.id ASC
          ) AS position_rank
        FROM "player_positions" pp
        INNER JOIN "players" p ON p.id = pp.player_id
      )
      UPDATE "player_positions" pp
      SET "is_primary" = (rp.position_rank = 1)
      FROM ranked_positions rp
      WHERE pp.id = rp.id
    `);

    await queryRunner.query(`
      UPDATE "players" p
      SET "primary_position" = pp."position_code"
      FROM "player_positions" pp
      WHERE pp."player_id" = p."id"
        AND pp."is_primary" = TRUE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_player_positions_one_primary_per_player"
      ON "player_positions" ("player_id")
      WHERE "is_primary" = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_player_positions_one_primary_per_player"`,
    );
  }
}
