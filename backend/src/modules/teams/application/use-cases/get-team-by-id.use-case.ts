import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  TEAM_READ_REPOSITORY,
  TeamReadRepository,
} from '../ports/team-read.repository';
import { TeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/team.orm-entity';

@Injectable()
export class GetTeamByIdUseCase {
  constructor(
    @Inject(TEAM_READ_REPOSITORY)
    private readonly teamReadRepository: TeamReadRepository,
  ) {}

  async execute(id: string): Promise<TeamOrmEntity> {
    const team = await this.teamReadRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Đội bóng không tồn tại');
    }
    return team;
  }
}
