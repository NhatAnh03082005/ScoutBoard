import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSyncJobOrmEntity } from './infrastructure/persistence/typeorm/entities/data-sync-job.orm-entity';
import { DataSyncLogOrmEntity } from './infrastructure/persistence/typeorm/entities/data-sync-log.orm-entity';
import { DATA_SYNC_JOB_REPOSITORY } from './application/ports/data-sync-job.repository';
import { DATA_SYNC_LOG_REPOSITORY } from './application/ports/data-sync-log.repository';
import { TypeOrmDataSyncJobRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-data-sync-job.repository';
import { TypeOrmDataSyncLogRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-data-sync-log.repository';
import { ExecuteAdminSyncUseCase } from './application/use-cases/execute-admin-sync.use-case';
import { GetDataSyncJobByIdUseCase } from './application/use-cases/get-data-sync-job-by-id.use-case';
import { ListSyncJobsUseCase } from './application/use-cases/list-sync-jobs.use-case';
import { AdminDataSyncController } from './presentation/http/controllers/admin-data-sync.controller';
import { CompetitionsModule } from '../competitions/competitions.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { TeamsModule } from '../teams/teams.module';
import { MatchesModule } from '../matches/matches.module';
import { PlayersModule } from '../players/players.module';
import { UsersModule } from '../users/users.module';
import { CompetitionOrmEntity } from '../competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { MatchOrmEntity } from '../matches/infrastructure/persistence/typeorm/entities/match.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataSyncJobOrmEntity,
      DataSyncLogOrmEntity,
      CompetitionOrmEntity,
      SeasonOrmEntity,
      MatchOrmEntity,
    ]),
    CompetitionsModule,
    SeasonsModule,
    TeamsModule,
    MatchesModule,
    PlayersModule,
    UsersModule,
  ],
  controllers: [AdminDataSyncController],
  providers: [
    {
      provide: DATA_SYNC_JOB_REPOSITORY,
      useClass: TypeOrmDataSyncJobRepository,
    },
    {
      provide: DATA_SYNC_LOG_REPOSITORY,
      useClass: TypeOrmDataSyncLogRepository,
    },
    ExecuteAdminSyncUseCase,
    GetDataSyncJobByIdUseCase,
    ListSyncJobsUseCase,
  ],
  exports: [
    DATA_SYNC_JOB_REPOSITORY,
    DATA_SYNC_LOG_REPOSITORY,
    ExecuteAdminSyncUseCase,
    GetDataSyncJobByIdUseCase,
    ListSyncJobsUseCase,
  ],
})
export class DataSyncModule {}
