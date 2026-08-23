import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompetitionsModule } from './modules/competitions/competitions.module';
import { SeasonsModule } from './modules/seasons/seasons.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PlayersModule } from './modules/players/players.module';
import { MatchesModule } from './modules/matches/matches.module';
import { ShortlistsModule } from './modules/shortlists/shortlists.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    UsersModule,
    CompetitionsModule,
    SeasonsModule,
    TeamsModule,
    PlayersModule,
    MatchesModule,
    ShortlistsModule,
  ],
})
export class AppModule {}
