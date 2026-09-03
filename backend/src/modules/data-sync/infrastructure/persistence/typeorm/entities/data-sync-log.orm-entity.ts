import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DataSyncJobOrmEntity } from './data-sync-job.orm-entity';
import { SyncLogLevel } from '../../../../domain/enums/sync-log-level.enum';

@Entity('data_sync_logs')
@Index('idx_sync_logs_job_id', ['jobId', 'createdAt'])
export class DataSyncLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  level: SyncLogLevel;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  entityType: string | null;

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: null,
  })
  externalId: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  details: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => DataSyncJobOrmEntity, (job) => job.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job: DataSyncJobOrmEntity;
}
