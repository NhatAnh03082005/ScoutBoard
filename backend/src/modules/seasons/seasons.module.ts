import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonOrmEntity } from './infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SEASON_READ_REPOSITORY } from './application/ports/season-read.repository';
import { TypeOrmSeasonReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-season-read.repository';
import { SeasonsController } from './presentation/http/controllers/seasons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeasonOrmEntity])],
  controllers: [SeasonsController],
  providers: [
    {
      provide: SEASON_READ_REPOSITORY,
      useClass: TypeOrmSeasonReadRepository,
    },
  ],
  exports: [SEASON_READ_REPOSITORY],
})
export class SeasonsModule {}
