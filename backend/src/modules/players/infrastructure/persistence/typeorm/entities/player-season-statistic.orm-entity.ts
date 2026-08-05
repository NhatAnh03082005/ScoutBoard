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
import { PlayerOrmEntity } from './player.orm-entity';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

@Entity('player_season_statistics')
@Unique('UQ_player_season_stats_composite', [
  'playerId',
  'seasonId',
  'competitionId',
  'teamId',
])
@Index('IDX_player_season_stats_player_id', ['playerId'])
@Index('IDX_player_season_stats_season_comp', ['seasonId', 'competitionId'])
export class PlayerSeasonStatisticOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'season_id', type: 'uuid' })
  seasonId: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @Column({ name: 'team_id', type: 'uuid', nullable: true, default: null })
  teamId: string | null;

  @Column({ name: 'matches_played', type: 'integer', default: 0 })
  matchesPlayed: number;

  @Column({ type: 'integer', default: 0 })
  starts: number;

  @Column({ name: 'minutes_played', type: 'integer', default: 0 })
  minutesPlayed: number;

  @Column({ type: 'integer', default: 0 })
  goals: number;

  @Column({ type: 'integer', default: 0 })
  assists: number;

  @Column({ type: 'integer', default: 0 })
  shots: number;

  @Column({ name: 'shots_on_target', type: 'integer', default: 0 })
  shotsOnTarget: number;

  @Column({ name: 'key_passes', type: 'integer', default: 0 })
  keyPasses: number;

  @Column({ type: 'integer', default: 0 })
  passes: number;

  @Column({
    name: 'pass_accuracy',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  passAccuracy: number | null;

  @Column({ type: 'integer', default: 0 })
  tackles: number;

  @Column({ type: 'integer', default: 0 })
  interceptions: number;

  @Column({ name: 'yellow_cards', type: 'integer', default: 0 })
  yellowCards: number;

  @Column({ name: 'red_cards', type: 'integer', default: 0 })
  redCards: number;

  @Column({ name: 'duels_won', type: 'integer', default: 0 })
  duelsWon: number;

  @Column({
    name: 'advanced_statistics',
    type: 'jsonb',
    nullable: true,
    default: null,
  })
  advancedStatistics: Record<string, any> | null;

  @Column({
    name: 'goals_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  goalsPer90: number;

  @Column({
    name: 'assists_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  assistsPer90: number;

  @Column({
    name: 'key_passes_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  keyPassesPer90: number;

  @Column({
    name: 'tackles_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  tacklesPer90: number;

  @Column({
    name: 'interceptions_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  interceptionsPer90: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => PlayerOrmEntity, (player) => player.seasonStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'player_id' })
  player: PlayerOrmEntity;

  @ManyToOne(() => SeasonOrmEntity, (season) => season.seasonStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'season_id' })
  season: SeasonOrmEntity;

  @ManyToOne(() => CompetitionOrmEntity, (comp) => comp.seasonStatistics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  competition: CompetitionOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.seasonStatistics, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamOrmEntity | null;
}
