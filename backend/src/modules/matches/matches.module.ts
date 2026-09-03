import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchOrmEntity } from './infrastructure/persistence/typeorm/entities/match.orm-entity';
import { PlayerMatchStatisticOrmEntity } from './infrastructure/persistence/typeorm/entities/player-match-statistic.orm-entity';
import { PlayerOrmEntity } from '../players/infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from '../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { MATCH_READ_REPOSITORY } from './application/ports/match-read.repository';
import { TypeOrmMatchReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-read.repository';
import { MATCH_WRITE_REPOSITORY } from './application/ports/match-write.repository';
import { TypeOrmMatchWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-match-write.repository';
import { PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY } from './application/ports/player-match-statistic-write.repository';
import { TypeOrmPlayerMatchStatisticWriteRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-player-match-statistic-write.repository';
import { MatchesController } from './presentation/http/controllers/matches.controller';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { GetMatchByIdUseCase } from './application/use-cases/get-match-by-id.use-case';
import { PersistMatchUseCase } from './application/use-cases/persist-match.use-case';
import { PersistPlayerMatchStatisticsUseCase } from './application/use-cases/persist-player-match-statistics.use-case';

import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { ExternalFootballModule } from '../external-football/external-football.module';
import { ApiFootballMatchSyncService } from './application/services/api-football-match-sync.service';
import { ApiFootballPlayerMatchStatsSyncService } from './application/services/api-football-player-match-stats-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchOrmEntity,
      PlayerMatchStatisticOrmEntity,
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
      provide: PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY,
      useClass: TypeOrmPlayerMatchStatisticWriteRepository,
    },
    ListMatchesUseCase,
    GetMatchByIdUseCase,
    PersistMatchUseCase,
    PersistPlayerMatchStatisticsUseCase,
    ApiFootballMatchSyncService,
    ApiFootballPlayerMatchStatsSyncService,
  ],
  exports: [
    MATCH_READ_REPOSITORY,
    MATCH_WRITE_REPOSITORY,
    PLAYER_MATCH_STATISTIC_WRITE_REPOSITORY,
    ListMatchesUseCase,
    GetMatchByIdUseCase,
    PersistMatchUseCase,
    PersistPlayerMatchStatisticsUseCase,
    ApiFootballMatchSyncService,
    ApiFootballPlayerMatchStatsSyncService,
  ],
})
export class MatchesModule {}
