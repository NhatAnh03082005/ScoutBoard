import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { PlayerOrmEntity } from './player.orm-entity';

@Entity('player_positions')
@Unique('UQ_player_positions_player_code', ['playerId', 'positionCode'])
@Index('IDX_player_positions_player_id', ['playerId'])
export class PlayerPositionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'position_code', type: 'varchar', length: 30 })
  positionCode: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ManyToOne(() => PlayerOrmEntity, (player) => player.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: PlayerOrmEntity;
}
