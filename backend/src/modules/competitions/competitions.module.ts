import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionOrmEntity } from './infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { COMPETITION_READ_REPOSITORY } from './application/ports/competition-read.repository';
import { TypeOrmCompetitionReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-competition-read.repository';
import { CompetitionsController } from './presentation/http/controllers/competitions.controller';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { GetCompetitionByIdUseCase } from './application/use-cases/get-competition-by-id.use-case';
import { GetSeasonsByCompetitionUseCase } from './application/use-cases/get-seasons-by-competition.use-case';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from './application/use-cases/get-current-season-teams-by-competition.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionOrmEntity]),
    SeasonsModule,
    TeamsModule,
  ],
  controllers: [CompetitionsController],
  providers: [
    {
      provide: COMPETITION_READ_REPOSITORY,
      useClass: TypeOrmCompetitionReadRepository,
    },
    ListCompetitionsUseCase,
    GetCompetitionByIdUseCase,
    GetSeasonsByCompetitionUseCase,
    GetCurrentSeasonTeamsByCompetitionUseCase,
  ],
  exports: [
    COMPETITION_READ_REPOSITORY,
    ListCompetitionsUseCase,
    GetCompetitionByIdUseCase,
    GetSeasonsByCompetitionUseCase,
    GetCurrentSeasonTeamsByCompetitionUseCase,
  ],
})
export class CompetitionsModule {}
