import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerOrmEntity } from './infrastructure/persistence/typeorm/entities/player.orm-entity';
import { PlayerPositionOrmEntity } from './infrastructure/persistence/typeorm/entities/player-position.orm-entity';
import { PlayerSeasonStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-season-statistic.orm-entity';
import { PlayerTeamHistoryOrmEntity } from './infrastructure/persistence/typeorm/entities/player-team-history.orm-entity';
import { PlayerMatchStatisticOrmEntity } from '../matches/infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { MatchOrmEntity } from '../matches/infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PLAYER_READ_REPOSITORY } from './application/ports/player-read.repository';
import { PLAYER_POSITION_WRITE_REPOSITORY } from './application/ports/player-position-write.repository';
import { PLAYER_WRITE_REPOSITORY } from './application/ports/player-write.repository';
import { PLAYER_TEAM_HISTORY_WRITE_REPOSITORY } from './application/ports/player-team-history-write.repository';
import { PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY } from './application/ports/player-season-statistic-write.repository';
import { TypeOrmPlayerReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-read.repository';
import { TypeOrmPlayerPositionWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-position-write.repository';
import { TypeOrmPlayerWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-write.repository';
import { TypeOrmPlayerTeamHistoryWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-team-history-write.repository';
import { TypeOrmPlayerSeasonStatisticWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-season-statistic-write.repository';
import { PlayersController } from './presentation/http/controllers/players.controller';

import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { ExternalFootballModule } from '../external-football/external-football.module';

import { SearchPlayersUseCase } from './application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from './application/use-cases/get-player-by-id.use-case';
import { GetPlayerTeamHistoryUseCase } from './application/use-cases/get-player-team-history.use-case';
import { GetPlayerSeasonStatisticsUseCase } from './application/use-cases/get-player-season-statistics.use-case';
import { GetPlayerMatchStatisticsUseCase } from './application/use-cases/get-player-match-statistics.use-case';
import { GetComparisonCandidatesUseCase } from './application/use-cases/get-comparison-candidates.use-case';
import { UpdatePlayerPrimaryPositionUseCase } from './application/use-cases/update-player-primary-position.use-case';
import { GetAvailablePositionsUseCase } from './application/use-cases/get-available-positions.use-case';
import { PersistPlayerUseCase } from './application/use-cases/persist-player.use-case';
import { PersistPlayerPositionsUseCase } from './application/use-cases/persist-player-positions.use-case';
import { PersistPlayerTeamHistoryUseCase } from './application/use-cases/persist-player-team-history.use-case';
import { EnrichPlayerProfileUseCase } from './application/use-cases/enrich-player-profile.use-case';
import { PlayerEnrichmentSyncService } from './application/services/player-enrichment-sync.service';
import { PlayerSeasonStatisticsAggregationService } from './application/services/player-season-statistics-aggregation.service';
import { ApiFootballPlayerSyncService } from './application/services/api-football-player-sync.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerOrmEntity,
      PlayerPositionOrmEntity,
      PlayerSeasonStatisticOrmEntity,
      PlayerTeamHistoryOrmEntity,
      PlayerMatchStatisticOrmEntity,
      MatchOrmEntity,
    ]),
    forwardRef(() => CompetitionsModule),
    forwardRef(() => SeasonsModule),
    forwardRef(() => TeamsModule),
    ExternalFootballModule,
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
    {
      provide: PLAYER_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerWriteRepository,
    },
    {
      provide: PLAYER_TEAM_HISTORY_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerTeamHistoryWriteRepository,
    },
    {
      provide: PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerSeasonStatisticWriteRepository,
    },
    SearchPlayersUseCase,
    GetPlayerByIdUseCase,
    GetPlayerTeamHistoryUseCase,
    GetPlayerSeasonStatisticsUseCase,
    GetPlayerMatchStatisticsUseCase,
    GetComparisonCandidatesUseCase,
    UpdatePlayerPrimaryPositionUseCase,
    GetAvailablePositionsUseCase,
    PersistPlayerUseCase,
    PersistPlayerPositionsUseCase,
    PersistPlayerTeamHistoryUseCase,
    EnrichPlayerProfileUseCase,
    PlayerEnrichmentSyncService,
    PlayerSeasonStatisticsAggregationService,
    ApiFootballPlayerSyncService,
  ],
  exports: [
    PLAYER_READ_REPOSITORY,
    PLAYER_POSITION_WRITE_REPOSITORY,
    PLAYER_WRITE_REPOSITORY,
    PLAYER_TEAM_HISTORY_WRITE_REPOSITORY,
    PLAYER_SEASON_STATISTIC_WRITE_REPOSITORY,
    SearchPlayersUseCase,
    GetPlayerByIdUseCase,
    GetPlayerTeamHistoryUseCase,
    GetPlayerSeasonStatisticsUseCase,
    GetPlayerMatchStatisticsUseCase,
    GetComparisonCandidatesUseCase,
    UpdatePlayerPrimaryPositionUseCase,
    GetAvailablePositionsUseCase,
    PersistPlayerUseCase,
    PersistPlayerPositionsUseCase,
    PersistPlayerTeamHistoryUseCase,
    EnrichPlayerProfileUseCase,
    PlayerEnrichmentSyncService,
    PlayerSeasonStatisticsAggregationService,
    ApiFootballPlayerSyncService,
  ],
})

export class PlayersModule {}

