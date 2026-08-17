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
import { PlayerOrmEntity } from 'src/modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

@Entity('player_match_statistics')
@Unique('UQ_player_match_stats_composite', ['matchId', 'playerId'])
@Index('IDX_player_match_stats_match_id', ['matchId'])
@Index('IDX_player_match_stats_player_id', ['playerId'])
export class PlayerMatchStatisticOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @Column({ name: 'minutes_played', type: 'integer', default: 0 })
  minutesPlayed: number;

  @Column({ name: 'is_starter', type: 'boolean', default: false })
  isStarter: boolean;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    nullable: true,
    default: null,
  })
  rating: number | null;

  @Column({ type: 'integer', default: 0 })
  goals: number;

  @Column({ type: 'integer', default: 0 })
  assists: number;

  @Column({ type: 'integer', default: 0 })
  shots: number;

  @Column({ name: 'key_passes', type: 'integer', default: 0 })
  keyPasses: number;

  @Column({ name: 'passes_attempted', type: 'integer', default: 0 })
  passesAttempted: number;

  @Column({ name: 'passes_completed', type: 'integer', default: 0 })
  passesCompleted: number;

  @Column({ type: 'integer', default: 0 })
  tackles: number;

  @Column({ type: 'integer', default: 0 })
  interceptions: number;

  @Column({ name: 'yellow_cards', type: 'integer', default: 0 })
  yellowCards: number;

  @Column({ name: 'red_cards', type: 'integer', default: 0 })
  redCards: number;

  @Column({ type: 'jsonb', nullable: true, default: null })
  statistics: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => MatchOrmEntity, (match) => match.matchStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match: MatchOrmEntity;

  @ManyToOne(() => PlayerOrmEntity, (player) => player.matchStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: PlayerOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.matchStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamOrmEntity;
}
