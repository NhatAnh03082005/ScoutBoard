import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchOrmEntity } from './infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerMatchStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { MATCH_READ_REPOSITORY } from './application/ports/match-read.repository';
import { TypeOrmMatchReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-read.repository';
import { MatchesController } from './presentation/http/controllers/matches.controller';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { GetMatchByIdUseCase } from './application/use-cases/get-match-by-id.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchOrmEntity, PlayerMatchStatisticOrmEntity]),
  ],
  controllers: [MatchesController],
  providers: [
    {
      provide: MATCH_READ_REPOSITORY,
      useClass: TypeOrmMatchReadRepository,
    },
    ListMatchesUseCase,
    GetMatchByIdUseCase,
  ],
  exports: [MATCH_READ_REPOSITORY, ListMatchesUseCase, GetMatchByIdUseCase],
})
export class MatchesModule {}
