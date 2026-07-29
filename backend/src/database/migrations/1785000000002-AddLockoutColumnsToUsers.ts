import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLockoutColumnsToUsers1785000000002 implements MigrationInterface {
  name = 'AddLockoutColumnsToUsers1785000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "lockout_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "locked_until" timestamptz NULL DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "last_failed_login_at" timestamptz NULL DEFAULT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_failed_login_attempts_non_negative" CHECK ("failed_login_attempts" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "CHK_users_lockout_count_non_negative" CHECK ("lockout_count" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_lockout_count_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_failed_login_attempts_non_negative"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "last_failed_login_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lockout_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "failed_login_attempts"`,
    );
  }
}
