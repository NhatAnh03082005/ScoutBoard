import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateDataSyncTables1789500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create data_sync_jobs Table
    await queryRunner.createTable(
      new Table({
        name: 'data_sync_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'initiated_by',
            type: 'uuid',
            isNullable: true,
            default: null,
          },
          {
            name: 'competition_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'season_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            default: "'FOOTBALL_DATA_ORG'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'PENDING'",
          },
          {
            name: 'trigger_type',
            type: 'varchar',
            length: '30',
            default: "'MANUAL'",
          },
          {
            name: 'scope',
            type: 'varchar',
            length: '30',
            default: "'SEASON'",
          },
          {
            name: 'target',
            type: 'varchar',
            length: '50',
            default: "'FULL'",
          },
          {
            name: 'mode',
            type: 'varchar',
            length: '30',
            default: "'REFRESH'",
          },
          {
            name: 'processed_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'updated_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'failed_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'started_at',
            type: 'timestamp with time zone',
            isNullable: true,
            default: null,
          },
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
            default: null,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
            default: null,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            default: null,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Foreign Keys for data_sync_jobs
    await queryRunner.createForeignKey(
      'data_sync_jobs',
      new TableForeignKey({
        name: 'FK_data_sync_jobs_initiated_by',
        columnNames: ['initiated_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'data_sync_jobs',
      new TableForeignKey({
        name: 'FK_data_sync_jobs_competition_id',
        columnNames: ['competition_id'],
        referencedTableName: 'competitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'data_sync_jobs',
      new TableForeignKey({
        name: 'FK_data_sync_jobs_season_id',
        columnNames: ['season_id'],
        referencedTableName: 'seasons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Indexes for data_sync_jobs
    await queryRunner.createIndex(
      'data_sync_jobs',
      new TableIndex({
        name: 'idx_sync_jobs_status_created',
        columnNames: ['status', 'started_at'],
      }),
    );

    await queryRunner.createIndex(
      'data_sync_jobs',
      new TableIndex({
        name: 'idx_sync_jobs_comp_season',
        columnNames: ['competition_id', 'season_id'],
      }),
    );

    // 2. Create data_sync_logs Table
    await queryRunner.createTable(
      new Table({
        name: 'data_sync_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'job_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'level',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
            default: null,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            default: null,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'details',
            type: 'jsonb',
            isNullable: true,
            default: null,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    // Foreign Key for data_sync_logs
    await queryRunner.createForeignKey(
      'data_sync_logs',
      new TableForeignKey({
        name: 'FK_data_sync_logs_job_id',
        columnNames: ['job_id'],
        referencedTableName: 'data_sync_jobs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Index for data_sync_logs
    await queryRunner.createIndex(
      'data_sync_logs',
      new TableIndex({
        name: 'idx_sync_logs_job_id',
        columnNames: ['job_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('data_sync_logs', true);
    await queryRunner.dropTable('data_sync_jobs', true);
  }
}
