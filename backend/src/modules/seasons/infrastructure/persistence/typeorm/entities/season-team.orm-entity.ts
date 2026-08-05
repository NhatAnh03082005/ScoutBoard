import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SeasonOrmEntity } from './season.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

@Entity('season_teams')
@Index('IDX_season_teams_team_id', ['teamId'])
export class SeasonTeamOrmEntity {
  @PrimaryColumn({ name: 'season_id', type: 'uuid' })
  seasonId: string;

  @PrimaryColumn({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @ManyToOne(() => SeasonOrmEntity, (season) => season.seasonTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'season_id' })
  season: SeasonOrmEntity;

  @ManyToOne(() => TeamOrmEntity, (team) => team.seasonTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_id' })
  team: TeamOrmEntity;
}
