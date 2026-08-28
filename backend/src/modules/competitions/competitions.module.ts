import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionOrmEntity } from './infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { COMPETITION_READ_REPOSITORY } from './application/ports/competition-read.repository';
import { TypeOrmCompetitionReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-competition-read.repository';
import { COMPETITION_WRITE_REPOSITORY } from './application/ports/competition-write.repository';
import { TypeOrmCompetitionWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-competition-write.repository';
import { CompetitionsController } from './presentation/http/controllers/competitions.controller';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { ListCompetitionsUseCase } from './application/use-cases/list-competitions.use-case';
import { GetCompetitionByIdUseCase } from './application/use-cases/get-competition-by-id.use-case';
import { GetSeasonsByCompetitionUseCase } from './application/use-cases/get-seasons-by-competition.use-case';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from './application/use-cases/get-current-season-teams-by-competition.use-case';
import { ExternalFootballModule } from '../external-football/external-football.module';
import { PersistCompetitionUseCase } from './application/use-cases/persist-competition.use-case';
import { PersistCompetitionWithSeasonsUseCase } from './application/use-cases/persist-competition-with-seasons.use-case';
import { CompetitionSeasonSyncService } from './application/services/competition-season-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionOrmEntity]),
    forwardRef(() => SeasonsModule),
    forwardRef(() => TeamsModule),
    ExternalFootballModule,
  ],
  controllers: [CompetitionsController],
  providers: [
    {
      provide: COMPETITION_READ_REPOSITORY,
      useClass: TypeOrmCompetitionReadRepository,
    },
    {
      provide: COMPETITION_WRITE_REPOSITORY,
      useClass: TypeOrmCompetitionWriteRepository,
    },
    ListCompetitionsUseCase,
    GetCompetitionByIdUseCase,
    GetSeasonsByCompetitionUseCase,
    GetCurrentSeasonTeamsByCompetitionUseCase,
    PersistCompetitionUseCase,
    PersistCompetitionWithSeasonsUseCase,
    CompetitionSeasonSyncService,
  ],
  exports: [
    COMPETITION_READ_REPOSITORY,
    COMPETITION_WRITE_REPOSITORY,
    ListCompetitionsUseCase,
    GetCompetitionByIdUseCase,
    GetSeasonsByCompetitionUseCase,
    GetCurrentSeasonTeamsByCompetitionUseCase,
    PersistCompetitionUseCase,
    PersistCompetitionWithSeasonsUseCase,
    CompetitionSeasonSyncService,
  ],
})
export class CompetitionsModule {}
