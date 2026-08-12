import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from './infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { PlayerTeamHistoryOrmEntity } from './infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PLAYER_READ_REPOSITORY } from './application/ports/player-read.repository';
import { TypeOrmPlayerReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository';
import { PlayersController } from './presentation/http/controllers/players.controller';

import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';

import { SearchPlayersUseCase } from './application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from './application/use-cases/get-player-by-id.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerOrmEntity,
      PlayerPositionOrmEntity,
      PlayerSeasonStatisticOrmEntity,
      PlayerTeamHistoryOrmEntity,
    ]),
    CompetitionsModule,
    SeasonsModule,
  ],
  controllers: [PlayersController],
  providers: [
    {
      provide: PLAYER_READ_REPOSITORY,
      useClass: TypeOrmPlayerReadRepository,
    },
    SearchPlayersUseCase,
    GetPlayerByIdUseCase,
  ],
  exports: [PLAYER_READ_REPOSITORY, SearchPlayersUseCase, GetPlayerByIdUseCase],
})
export class PlayersModule {}
