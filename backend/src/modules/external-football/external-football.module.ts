import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { API_FOOTBALL_CLIENT } from './application/ports/api-football-client.port';
import { ApiFootballClient } from './infrastructure/clients/api-football.client';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: API_FOOTBALL_CLIENT,
      useClass: ApiFootballClient,
    },
    ApiFootballClient,
  ],
  exports: [API_FOOTBALL_CLIENT, ApiFootballClient],
})
export class ExternalFootballModule {}
