import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamOrmEntity } from './infrastructure/persistence/typeorm/entities/team.orm-entity';
import { SeasonTeamOrmEntity } from '../seasons/infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { TEAM_READ_REPOSITORY } from './application/ports/team-read.repository';
import { TypeOrmTeamReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-team-read.repository';
import { TeamsController } from './presentation/http/controllers/teams.controller';
import { ListTeamsUseCase } from './application/use-cases/list-teams.use-case';
import { GetTeamByIdUseCase } from './application/use-cases/get-team-by-id.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([TeamOrmEntity, SeasonTeamOrmEntity])],
  controllers: [TeamsController],
  providers: [
    {
      provide: TEAM_READ_REPOSITORY,
      useClass: TypeOrmTeamReadRepository,
    },
    ListTeamsUseCase,
    GetTeamByIdUseCase,
  ],
  exports: [TEAM_READ_REPOSITORY, ListTeamsUseCase, GetTeamByIdUseCase],
})
export class TeamsModule {}
