import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';

@Entity('seasons')
@Unique('UQ_seasons_competition_provider_external_id', [
  'competitionId',
  'externalProvider',
  'externalId',
])
@Index('IDX_seasons_competition_id', ['competitionId'])
export class SeasonOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'start_date', type: 'date', nullable: true, default: null })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true, default: null })
  endDate: string | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({
    name: 'data_updated_at',
    type: 'timestamp with time zone',
    nullable: true,
    default: null,
  })
  dataUpdatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => CompetitionOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition: CompetitionOrmEntity;
}
