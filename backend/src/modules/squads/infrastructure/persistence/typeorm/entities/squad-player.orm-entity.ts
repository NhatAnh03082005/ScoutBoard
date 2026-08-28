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
import { SquadOrmEntity } from './squad.orm-entity';
import type { PlayerOrmEntity } from '../../../../../players/infrastructure/persistence/typeorm/entities/player.orm-entity';

@Entity('squad_players')
@Unique('UQ_squad_players_squad_player', ['squadId', 'playerId'])
@Index('IDX_squad_players_squad_id', ['squadId'])
@Index('IDX_squad_players_player_id', ['playerId'])
export class SquadPlayerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'squad_id', type: 'uuid' })
  squadId: string;

  @ManyToOne(() => SquadOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'squad_id' })
  squad?: SquadOrmEntity;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @ManyToOne('PlayerOrmEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_id' })
  player?: PlayerOrmEntity;

  @Column({ name: 'slot_code', type: 'varchar', length: 30, nullable: true })
  slotCode: string | null;

  @Column({ name: 'role', type: 'varchar', length: 30 })
  role: string;

  @Column({ name: 'is_captain', type: 'boolean', default: false })
  isCaptain: boolean;

  @Column({ name: 'display_order', type: 'integer', nullable: true })
  displayOrder: number | null;

  @CreateDateColumn({ name: 'added_at', type: 'timestamp with time zone' })
  addedAt: Date;
}
