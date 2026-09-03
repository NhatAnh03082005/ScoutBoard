import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { CompetitionOrmEntity } from '../../../../../competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { DataSyncLogOrmEntity } from './data-sync-log.orm-entity';
import { SyncJobStatus } from '../../../../domain/enums/sync-job-status.enum';
import { SyncTriggerType } from '../../../../domain/enums/sync-trigger-type.enum';
import { SyncScope } from '../../../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../../../domain/enums/sync-target.enum';
import { SyncMode } from '../../../../domain/enums/sync-mode.enum';

@Entity('data_sync_jobs')
@Index('idx_sync_jobs_status_created', ['status', 'startedAt'])
@Index('idx_sync_jobs_comp_season', ['competitionId', 'seasonId'])
export class DataSyncJobOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'initiated_by', type: 'uuid', nullable: true, default: null })
  initiatedBy: string | null;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @Column({ name: 'season_id', type: 'uuid' })
  seasonId: string;

  @Column({ type: 'varchar', length: 50, default: 'FOOTBALL_DATA_ORG' })
  provider: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: SyncJobStatus.PENDING,
  })
  status: SyncJobStatus;

  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 30,
    default: SyncTriggerType.MANUAL,
  })
  triggerType: SyncTriggerType;

  @Column({
    type: 'varchar',
    length: 30,
    default: SyncScope.SEASON,
  })
  scope: SyncScope;

  @Column({
    type: 'varchar',
    length: 50,
    default: SyncTarget.FULL,
  })
  target: SyncTarget;

  @Column({
    type: 'varchar',
    length: 30,
    default: SyncMode.REFRESH,
  })
  mode: SyncMode;

  @Column({ name: 'processed_count', type: 'integer', default: 0 })
  processedCount: number;

  @Column({ name: 'created_count', type: 'integer', default: 0 })
  createdCount: number;

  @Column({ name: 'updated_count', type: 'integer', default: 0 })
  updatedCount: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount: number;

  @Column({
    name: 'started_at',
    type: 'timestamp with time zone',
    nullable: true,
    default: null,
  })
  startedAt: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
    default: null,
  })
  completedAt: Date | null;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    default: null,
  })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'initiated_by' })
  user: UserOrmEntity | null;

  @ManyToOne(() => CompetitionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: CompetitionOrmEntity;

  @ManyToOne(() => SeasonOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'season_id' })
  season: SeasonOrmEntity;

  @OneToMany(() => DataSyncLogOrmEntity, (log) => log.job, { cascade: true })
  logs: DataSyncLogOrmEntity[];
}
