import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamOrmEntity } from './infrastructure/persistence/typeorm/entities/team.orm-entity';
import { TEAM_READ_REPOSITORY } from './application/ports/team-read.repository';
import { TypeOrmTeamReadRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-team-read.repository';
import { TeamsController } from './presentation/http/controllers/teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeamOrmEntity])],
  controllers: [TeamsController],
  providers: [
    {
      provide: TEAM_READ_REPOSITORY,
      useClass: TypeOrmTeamReadRepository,
    },
  ],
  exports: [TEAM_READ_REPOSITORY],
})
export class TeamsModule {}
