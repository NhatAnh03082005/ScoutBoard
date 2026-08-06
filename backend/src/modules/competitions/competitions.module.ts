import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionOrmEntity } from './infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { COMPETITION_READ_REPOSITORY } from './application/ports/competition-read.repository';
import { TypeOrmCompetitionReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-competition-read.repository';
import { CompetitionsController } from './presentation/http/controllers/competitions.controller';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
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
    GetCurrentSeasonTeamsByCompetitionUseCase,
  ],
  exports: [
    COMPETITION_READ_REPOSITORY,
    GetCurrentSeasonTeamsByCompetitionUseCase,
  ],
})
export class CompetitionsModule {}
