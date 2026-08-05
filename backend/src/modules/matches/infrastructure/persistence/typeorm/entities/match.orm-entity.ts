import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import type { PlayerMatchStatisticOrmEntity } from './player-match-statistic.orm-entity';

@Entity('matches')
@Unique('UQ_matches_provider_external_id', ['externalProvider', 'externalId'])
@Index('IDX_matches_provider_external_id', ['externalProvider', 'externalId'])
@Index('IDX_matches_competition_season', ['competitionId', 'seasonId'])
export class MatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'competition_id', type: 'uuid' })
  competitionId: string;

  @Column({ name: 'season_id', type: 'uuid' })
  seasonId: string;

  @Column({ name: 'home_team_id', type: 'uuid' })
  homeTeamId: string;

  @Column({ name: 'away_team_id', type: 'uuid' })
  awayTeamId: string;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({
    name: 'match_date',
    type: 'timestamp with time zone',
    nullable: true,
    default: null,
  })
  matchDate: Date | null;

  @Column({ type: 'varchar', length: 30, default: 'FINISHED' })
  status: string;

  @Column({
    name: 'home_score',
    type: 'integer',
    nullable: true,
    default: null,
  })
  homeScore: number | null;

  @Column({
    name: 'away_score',
    type: 'integer',
    nullable: true,
    default: null,
  })
  awayScore: number | null;

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

  @ManyToOne(() => CompetitionOrmEntity, (comp) => comp.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'competition_id' })
  competition: CompetitionOrmEntity;

  @ManyToOne(() => SeasonOrmEntity, (season) => season.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'season_id' })
  season: SeasonOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.homeMatches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'home_team_id' })
  homeTeam: TeamOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.awayMatches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'away_team_id' })
  awayTeam: TeamOrmEntity;

  @OneToMany('PlayerMatchStatisticOrmEntity', 'match')
  matchStatistics: PlayerMatchStatisticOrmEntity[];
}
