import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionOrmEntity } from './infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { COMPETITION_READ_REPOSITORY } from './application/ports/competition-read.repository';
import { TypeOrmCompetitionReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-competition-read.repository';
import { CompetitionsController } from './presentation/http/controllers/competitions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionOrmEntity])],
  controllers: [CompetitionsController],
  providers: [
    {
      provide: COMPETITION_READ_REPOSITORY,
      useClass: TypeOrmCompetitionReadRepository,
    },
  ],
  exports: [COMPETITION_READ_REPOSITORY],
})
export class CompetitionsModule {}
