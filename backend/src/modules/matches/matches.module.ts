import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchOrmEntity } from './infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerMatchStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { MATCH_READ_REPOSITORY } from './application/ports/match-read.repository';
import { TypeOrmMatchReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-read.repository';
import { MatchesController } from './presentation/http/controllers/matches.controller';

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
  ],
  exports: [MATCH_READ_REPOSITORY],
})
export class MatchesModule {}
