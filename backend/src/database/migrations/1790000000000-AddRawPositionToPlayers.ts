import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRawPositionToPlayers1790000000000 implements MigrationInterface {
  name = 'AddRawPositionToPlayers1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "raw_position" character varying(50) DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "players" DROP COLUMN IF EXISTS "raw_position";
    `);
  }
}
