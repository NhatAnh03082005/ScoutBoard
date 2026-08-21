import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from './infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { PlayerTeamHistoryOrmEntity } from './infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PLAYER_READ_REPOSITORY } from './application/ports/player-read.repository';
import { PLAYER_POSITION_WRITE_REPOSITORY } from './application/ports/player-position-write.repository';
import { TypeOrmPlayerReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository';
import { TypeOrmPlayerPositionWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-position-write.repository';
import { PlayersController } from './presentation/http/controllers/players.controller';

import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';

import { SearchPlayersUseCase } from './application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from './application/use-cases/get-player-by-id.use-case';
import { GetPlayerTeamHistoryUseCase } from './application/use-cases/get-player-team-history.use-case';
import { GetPlayerSeasonStatisticsUseCase } from './application/use-cases/get-player-season-statistics.use-case';
import { GetPlayerMatchStatisticsUseCase } from './application/use-cases/get-player-match-statistics.use-case';
import { GetComparisonCandidatesUseCase } from './application/use-cases/get-comparison-candidates.use-case';
import { UpdatePlayerPrimaryPositionUseCase } from './application/use-cases/update-player-primary-position.use-case';

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
    {
      provide: PLAYER_POSITION_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerPositionWriteRepository,
    },
    SearchPlayersUseCase,
    GetPlayerByIdUseCase,
    GetPlayerTeamHistoryUseCase,
    GetPlayerSeasonStatisticsUseCase,
    GetPlayerMatchStatisticsUseCase,
    GetComparisonCandidatesUseCase,
    UpdatePlayerPrimaryPositionUseCase,
  ],
  exports: [
    PLAYER_READ_REPOSITORY,
    SearchPlayersUseCase,
    GetPlayerByIdUseCase,
    GetPlayerTeamHistoryUseCase,
    GetPlayerSeasonStatisticsUseCase,
    GetPlayerMatchStatisticsUseCase,
    GetComparisonCandidatesUseCase,
    UpdatePlayerPrimaryPositionUseCase,
  ],
})
export class PlayersModule {}
