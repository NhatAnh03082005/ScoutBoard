import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PlayerOrmEntity } from './player.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

@Entity('player_team_history')
@Index('IDX_player_team_history_player_id', ['playerId'])
@Index('IDX_player_team_history_team_id', ['teamId'])
export class PlayerTeamHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @Column({ name: 'start_date', type: 'date', nullable: true, default: null })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true, default: null })
  endDate: string | null;

  @Column({
    name: 'shirt_number',
    type: 'integer',
    nullable: true,
    default: null,
  })
  shirtNumber: number | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => PlayerOrmEntity, (player) => player.teamHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: PlayerOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.teamHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamOrmEntity;
}
