import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from './infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { PlayerTeamHistoryOrmEntity } from './infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PLAYER_READ_REPOSITORY } from './application/ports/player-read.repository';
import { TypeOrmPlayerReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository';
import { PlayersController } from './presentation/http/controllers/players.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerOrmEntity,
      PlayerPositionOrmEntity,
      PlayerSeasonStatisticOrmEntity,
      PlayerTeamHistoryOrmEntity,
    ]),
  ],
  controllers: [PlayersController],
  providers: [
    {
      provide: PLAYER_READ_REPOSITORY,
      useClass: TypeOrmPlayerReadRepository,
    },
  ],
  exports: [PLAYER_READ_REPOSITORY],
})
export class PlayersModule {}
