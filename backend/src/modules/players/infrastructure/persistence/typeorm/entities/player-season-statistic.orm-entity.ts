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
    nullable: true,
    default: null,
  })
  goalsPer90: number | null;

  @Column({
    name: 'assists_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  assistsPer90: number | null;

  @Column({
    name: 'key_passes_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  keyPassesPer90: number | null;

  @Column({
    name: 'tackles_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  tacklesPer90: number | null;

  @Column({
    name: 'interceptions_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  interceptionsPer90: number | null;

  // Goalkeeper Specific Columns (Nullable for Outfield Players)
  @Column({ type: 'integer', nullable: true, default: null })
  saves: number | null;

  @Column({ name: 'goals_conceded', type: 'integer', nullable: true, default: null })
  goalsConceded: number | null;

  @Column({ name: 'clean_sheets', type: 'integer', nullable: true, default: null })
  cleanSheets: number | null;

  @Column({ name: 'penalties_saved', type: 'integer', nullable: true, default: null })
  penaltiesSaved: number | null;

  @Column({ name: 'penalties_faced', type: 'integer', nullable: true, default: null })
  penaltiesFaced: number | null;

  @Column({
    name: 'saves_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  savesPer90: number | null;

  @Column({
    name: 'goals_conceded_per_90',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  goalsConcededPer90: number | null;

  @Column({
    name: 'save_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: null,
  })
  savePercentage: number | null;

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
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamOrmEntity | null;
}
