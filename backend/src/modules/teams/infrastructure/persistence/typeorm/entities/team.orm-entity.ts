import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  OneToMany,
} from 'typeorm';
import type { PlayerOrmEntity } from 'src/modules/players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import type { PlayerTeamHistoryOrmEntity } from 'src/modules/players/infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import type { MatchOrmEntity } from 'src/modules/matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import type { PlayerMatchStatisticOrmEntity } from 'src/modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import type { PlayerSeasonStatisticOrmEntity } from 'src/modules/players/infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import type { SeasonTeamOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';

@Entity('teams')
@Unique('UQ_teams_provider_external_id', ['externalProvider', 'externalId'])
@Index('IDX_teams_provider_external_id', ['externalProvider', 'externalId'])
export class TeamOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({
    name: 'short_name',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  shortName: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, default: null })
  tla: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  country: string | null;

  @Column({
    name: 'founded_year',
    type: 'integer',
    nullable: true,
    default: null,
  })
  foundedYear: number | null;

  @Column({
    name: 'venue_name',
    type: 'varchar',
    length: 150,
    nullable: true,
    default: null,
  })
  venueName: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true, default: null })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

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

  @OneToMany('PlayerOrmEntity', 'currentTeam')
  players: PlayerOrmEntity[];

  @OneToMany('PlayerTeamHistoryOrmEntity', 'team')
  teamHistory: PlayerTeamHistoryOrmEntity[];

  @OneToMany('MatchOrmEntity', 'homeTeam')
  homeMatches: MatchOrmEntity[];

  @OneToMany('MatchOrmEntity', 'awayTeam')
  awayMatches: MatchOrmEntity[];

  @OneToMany('PlayerMatchStatisticOrmEntity', 'team')
  matchStatistics: PlayerMatchStatisticOrmEntity[];

  @OneToMany('PlayerSeasonStatisticOrmEntity', 'team')
  seasonStatistics: PlayerSeasonStatisticOrmEntity[];

  @OneToMany('SeasonTeamOrmEntity', 'team')
  seasonTeams: SeasonTeamOrmEntity[];
}
