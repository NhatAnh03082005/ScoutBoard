import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ShortlistOrmEntity } from './shortlist.orm-entity';
import type { PlayerOrmEntity } from '../../../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

@Entity('shortlist_players')
@Unique('UQ_shortlist_players_shortlist_player', ['shortlistId', 'playerId'])
@Index('IDX_shortlist_players_shortlist_id', ['shortlistId'])
@Index('IDX_shortlist_players_player_id', ['playerId'])
export class ShortlistPlayerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shortlist_id', type: 'uuid' })
  shortlistId: string;

  @ManyToOne(() => ShortlistOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shortlist_id' })
  shortlist?: ShortlistOrmEntity;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne('PlayerOrmEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: PlayerOrmEntity;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'added_at', type: 'timestamp with time zone' })
  addedAt: Date;
}
