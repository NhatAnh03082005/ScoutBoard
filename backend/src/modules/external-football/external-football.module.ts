import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FOOTBALL_API_CLIENT } from './application/ports/football-api-client.port';
import { FootballDataOrgClient } from './infrastructure/clients/football-data-org.client';
import { SPORTMONKS_API_CLIENT } from './application/ports/sportmonks-api-client.port';
import { SportmonksClient } from './infrastructure/clients/sportmonks.client';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FOOTBALL_API_CLIENT,
      useClass: FootballDataOrgClient,
    },
    FootballDataOrgClient,
    {
      provide: SPORTMONKS_API_CLIENT,
      useClass: SportmonksClient,
    },
    SportmonksClient,
  ],
  exports: [
    FOOTBALL_API_CLIENT,
    FootballDataOrgClient,
    SPORTMONKS_API_CLIENT,
    SportmonksClient,
  ],
})
export class ExternalFootballModule {}
