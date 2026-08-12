import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonOrmEntity } from './infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SeasonTeamOrmEntity } from './infrastructure/persistence/typeorm/entities/season-team.orm-entity';
import { SEASON_READ_REPOSITORY } from './application/ports/season-read.repository';
import { TypeOrmSeasonReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-season-read.repository';
import { SeasonsController } from './presentation/http/controllers/seasons.controller';
import { ListSeasonsUseCase } from './application/use-cases/list-seasons.use-case';
import { GetSeasonByIdUseCase } from './application/use-cases/get-season-by-id.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonOrmEntity, SeasonTeamOrmEntity])],
  controllers: [SeasonsController],
  providers: [
    {
      provide: SEASON_READ_REPOSITORY,
      useClass: TypeOrmSeasonReadRepository,
    },
    ListSeasonsUseCase,
    GetSeasonByIdUseCase,
  ],
  exports: [SEASON_READ_REPOSITORY, ListSeasonsUseCase, GetSeasonByIdUseCase],
})
export class SeasonsModule {}
