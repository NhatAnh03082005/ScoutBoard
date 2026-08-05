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
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { PlayerPositionOrmEntity } from './player-position.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from './player-season-statistic.orm-entity';
import type { PlayerTeamHistoryOrmEntity } from './player-team-history.orm-entity';
import type { PlayerMatchStatisticOrmEntity } from 'src/modules/matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';

@Entity('players')
@Unique('UQ_players_provider_external_id', ['externalProvider', 'externalId'])
@Index('IDX_players_provider_external_id', ['externalProvider', 'externalId'])
@Index('IDX_players_name', ['name'])
@Index('IDX_players_primary_position', ['primaryPosition'])
export class PlayerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'current_team_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  currentTeamId: string | null;

  @Column({ name: 'external_provider', type: 'varchar', length: 50 })
  externalProvider: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100 })
  externalId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({
    name: 'normalized_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    default: null,
  })
  normalizedName: string | null;

  @Column({
    name: 'short_name',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: null,
  })
  shortName: string | null;

  @Column({
    name: 'date_of_birth',
    type: 'date',
    nullable: true,
    default: null,
  })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  nationality: string | null;

  @Column({
    name: 'height_cm',
    type: 'integer',
    nullable: true,
    default: null,
  })
  heightCm: number | null;

  @Column({
    name: 'weight_kg',
    type: 'integer',
    nullable: true,
    default: null,
  })
  weightKg: number | null;

  @Column({
    name: 'preferred_foot',
    type: 'varchar',
    length: 10,
    nullable: true,
    default: null,
  })
  preferredFoot: string | null;

  @Column({
    name: 'primary_position',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  primaryPosition: string | null;

  @Column({
    name: 'shirt_number',
    type: 'integer',
    nullable: true,
    default: null,
  })
  shirtNumber: number | null;

  @Column({ name: 'image_url', type: 'text', nullable: true, default: null })
  imageUrl: string | null;

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

  @ManyToOne(() => TeamOrmEntity, (team) => team.players, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'current_team_id' })
  currentTeam: TeamOrmEntity | null;

  @OneToMany(() => PlayerPositionOrmEntity, (pp) => pp.player)
  positions: PlayerPositionOrmEntity[];

  @OneToMany('PlayerTeamHistoryOrmEntity', 'player')
  teamHistory: PlayerTeamHistoryOrmEntity[];

  @OneToMany('PlayerMatchStatisticOrmEntity', 'player')
  matchStatistics: PlayerMatchStatisticOrmEntity[];

  @OneToMany(() => PlayerSeasonStatisticOrmEntity, (pss) => pss.player)
  seasonStatistics: PlayerSeasonStatisticOrmEntity[];
}
