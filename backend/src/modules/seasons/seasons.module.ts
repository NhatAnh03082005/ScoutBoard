import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonOrmEntity } from './infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SeasonTeamOrmEntity } from './infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { SEASON_READ_REPOSITORY } from './application/ports/season-read.repository';
import { TypeOrmSeasonReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-season-read.repository';
import { SEASON_WRITE_REPOSITORY } from './application/ports/season-write.repository';
import { TypeOrmSeasonWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-season-write.repository';
import { SEASON_TEAM_WRITE_REPOSITORY } from './application/ports/season-team-write.repository';
import { TypeOrmSeasonTeamWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-season-team-write.repository';
import { SeasonsController } from './presentation/http/controllers/seasons.controller';
import { ListSeasonsUseCase } from './application/use-cases/list-seasons.use-case';
import { GetSeasonByIdUseCase } from './application/use-cases/get-season-by-id.use-case';
import { PersistSeasonUseCase } from './application/use-cases/persist-season.use-case';
import { PersistSeasonTeamsUseCase } from './application/use-cases/persist-season-teams.use-case';

import { CompetitionsModule } from '../competitions/competitions.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeasonOrmEntity, SeasonTeamOrmEntity]),
    forwardRef(() => CompetitionsModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [SeasonsController],
  providers: [
    {
      provide: SEASON_READ_REPOSITORY,
      useClass: TypeOrmSeasonReadRepository,
    },
    {
      provide: SEASON_WRITE_REPOSITORY,
      useClass: TypeOrmSeasonWriteRepository,
    },
    {
      provide: SEASON_TEAM_WRITE_REPOSITORY,
      useClass: TypeOrmSeasonTeamWriteRepository,
    },
    ListSeasonsUseCase,
    GetSeasonByIdUseCase,
    PersistSeasonUseCase,
    PersistSeasonTeamsUseCase,
  ],
  exports: [
    SEASON_READ_REPOSITORY,
    SEASON_WRITE_REPOSITORY,
    SEASON_TEAM_WRITE_REPOSITORY,
    ListSeasonsUseCase,
    GetSeasonByIdUseCase,
    PersistSeasonUseCase,
    PersistSeasonTeamsUseCase,
  ],
})
export class SeasonsModule {}

