import { Injectable, Inject } from '@nestjs/common';
import {
  TEAM_READ_REPOSITORY,
  TeamReadRepository,
} from '../ports/team-read.repository';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

@Injectable()
export class ListTeamsUseCase {
  constructor(
    @Inject(TEAM_READ_REPOSITORY)
    private readonly teamReadRepository: TeamReadRepository,
  ) {}

  async execute(): Promise<TeamOrmEntity[]> {
    return this.teamReadRepository.findAll();
  }
}
