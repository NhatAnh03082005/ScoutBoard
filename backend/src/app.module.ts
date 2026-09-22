import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { dataSourceOptions } from './database/data-source';
import { validateEnvironment } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { MatchesModule } from './modules/matches/matches.module';
import { ShortlistsModule } from './modules/shortlists/shortlists.module';
import { SquadsModule } from './modules/squads/squads.module';
import { ExternalFootballModule } from './modules/external-football/external-football.module';
import { DataSyncModule } from './modules/data-sync/data-sync.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: parseInt(
            config.get<string>('THROTTLE_GLOBAL_TTL_MS') || '60000',
            10,
          ),
          limit: parseInt(
            config.get<string>('THROTTLE_GLOBAL_LIMIT') || '100',
            10,
          ),
        },
      ],
    }),
    AuthModule,
    UsersModule,
    CompetitionsModule,
    SeasonsModule,
    TeamsModule,
    PlayersModule,
    MatchesModule,
    ShortlistsModule,
    SquadsModule,
    ExternalFootballModule,
    DataSyncModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
