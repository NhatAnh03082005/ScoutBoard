import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('competitions')
@Unique('UQ_competitions_provider_external_id', [
  'externalProvider',
  'externalId',
])
@Index('IDX_competitions_provider_external_id', [
  'externalProvider',
  'externalId',
])
export class CompetitionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  country: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, default: null })
  type: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true, default: null })
  logoUrl: string | null;

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
}
