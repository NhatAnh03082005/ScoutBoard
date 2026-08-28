import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchOrmEntity } from './infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerMatchStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { ExternalMatchMappingOrmEntity } from './infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';
import { PlayerOrmEntity } from '../players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MATCH_READ_REPOSITORY } from './application/ports/match-read.repository';
import { TypeOrmMatchReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-read.repository';
import { MATCH_WRITE_REPOSITORY } from './application/ports/match-write.repository';
import { TypeOrmMatchWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-write.repository';
import { EXTERNAL_MATCH_MAPPING_REPOSITORY } from './application/ports/external-match-mapping.repository';
import { TypeOrmExternalMatchMappingRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-external-match-mapping.repository';
import { PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY } from './application/ports/player-match-statistic-write.repository';
import { TypeOrmPlayerMatchStatisticWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-match-statistic-write.repository';
import { MatchesController } from './presentation/http/controllers/matches.controller';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { GetMatchByIdUseCase } from './application/use-cases/get-match-by-id.use-case';
import { PersistMatchUseCase } from './application/use-cases/persist-match.use-case';
import { MatchSyncService } from './application/services/match-sync.service';
import { ReconcileSportmonksMatchUseCase } from './application/use-cases/reconcile-sportmonks-match.use-case';
import { PersistPlayerMatchStatisticsUseCase } from './application/use-cases/persist-player-match-statistics.use-case';
import { PlayerMatchStatisticsSyncService } from './application/services/player-match-statistics-sync.service';

import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { ExternalFootballModule } from '../external-football/external-football.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchOrmEntity,
      PlayerMatchStatisticOrmEntity,
      ExternalMatchMappingOrmEntity,
      PlayerOrmEntity,
      TeamOrmEntity,
    ]),
    CompetitionsModule,
    SeasonsModule,
    TeamsModule,
    ExternalFootballModule,
  ],
  controllers: [MatchesController],
  providers: [
    {
      provide: MATCH_READ_REPOSITORY,
      useClass: TypeOrmMatchReadRepository,
    },
    {
      provide: MATCH_WRITE_REPOSITORY,
      useClass: TypeOrmMatchWriteRepository,
    },
    {
      provide: EXTERNAL_MATCH_MAPPING_REPOSITORY,
      useClass: TypeOrmExternalMatchMappingRepository,
    },
    {
      provide: PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerMatchStatisticWriteRepository,
    },
    ListMatchesUseCase,
    GetMatchByIdUseCase,
    PersistMatchUseCase,
    MatchSyncService,
    ReconcileSportmonksMatchUseCase,
    PersistPlayerMatchStatisticsUseCase,
    PlayerMatchStatisticsSyncService,
  ],
  exports: [
    MATCH_READ_REPOSITORY,
    MATCH_WRITE_REPOSITORY,
    EXTERNAL_MATCH_MAPPING_REPOSITORY,
    PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY,
    ListMatchesUseCase,
    GetMatchByIdUseCase,
    PersistMatchUseCase,
    MatchSyncService,
    ReconcileSportmonksMatchUseCase,
    PersistPlayerMatchStatisticsUseCase,
    PlayerMatchStatisticsSyncService,
  ],
})
export class MatchesModule {}
