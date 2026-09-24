import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1790200000000 implements MigrationInterface {
  name = 'AddAvatarUrlToUsers1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" character varying(1000) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url"`,
    );
  }
}
