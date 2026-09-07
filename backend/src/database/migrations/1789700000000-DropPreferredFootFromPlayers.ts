import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPreferredFootFromPlayers1789700000000
  implements MigrationInterface
{
  name = 'DropPreferredFootFromPlayers1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "players" DROP COLUMN IF EXISTS "preferred_foot";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "players" ADD COLUMN "preferred_foot" character varying(10) DEFAULT NULL;
    `);
  }
}
