import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { MatchOrmEntity } from './match.orm-entity';

@Entity('external_match_mappings')
@Unique('UQ_ext_match_mappings_provider_id', ['externalProvider', 'externalId'])
@Unique('UQ_ext_match_mappings_match_provider', ['matchId', 'externalProvider'])
@Index('IDX_ext_match_mappings_match_provider', ['matchId', 'externalProvider'])
export class ExternalMatchMappingOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
  })
  confidence: number;

  @Column({ type: 'varchar', length: 30, default: 'CONFIRMED' })
  status: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => MatchOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: MatchOrmEntity;
}
