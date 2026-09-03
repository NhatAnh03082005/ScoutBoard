import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamOrmEntity } from './infrastructure/persistence/typeorm/entities/team.orm-entity';
import { SeasonTeamOrmEntity } from '../seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { TEAM_READ_REPOSITORY } from './application/ports/team-read.repository';
import { TypeOrmTeamReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-team-read.repository';
import { TEAM_WRITE_REPOSITORY } from './application/ports/team-write.repository';
import { TypeOrmTeamWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-team-write.repository';
import { TeamsController } from './presentation/http/controllers/teams.controller';
import { ListTeamsUseCase } from './application/use-cases/list-teams.use-case';
import { GetTeamByIdUseCase } from './application/use-cases/get-team-by-id.use-case';
import { PersistTeamUseCase } from './application/use-cases/persist-team.use-case';
import { PersistTeamWithSquadUseCase } from './application/use-cases/persist-team-with-squad.use-case';
import { PlayersModule } from '../players/players.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { ExternalFootballModule } from '../external-football/external-football.module';
import { ApiFootballTeamSyncService } from './application/services/api-football-team-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamOrmEntity, SeasonTeamOrmEntity]),
    forwardRef(() => PlayersModule),
    forwardRef(() => SeasonsModule),
    ExternalFootballModule,
  ],
  controllers: [TeamsController],
  providers: [
    {
      provide: TEAM_READ_REPOSITORY,
      useClass: TypeOrmTeamReadRepository,
    },
    {
      provide: TEAM_WRITE_REPOSITORY,
      useClass: TypeOrmTeamWriteRepository,
    },
    ListTeamsUseCase,
    GetTeamByIdUseCase,
    PersistTeamUseCase,
    PersistTeamWithSquadUseCase,
    ApiFootballTeamSyncService,
  ],
  exports: [
    TEAM_READ_REPOSITORY,
    TEAM_WRITE_REPOSITORY,
    ListTeamsUseCase,
    GetTeamByIdUseCase,
    PersistTeamUseCase,
    PersistTeamWithSquadUseCase,
    ApiFootballTeamSyncService,
  ],
})
export class TeamsModule {}
