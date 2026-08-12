import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from '../ports/season-read.repository';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

@Injectable()
export class GetSeasonByIdUseCase {
  constructor(
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
  ) {}

  async execute(id: string): Promise<SeasonOrmEntity> {
    const season = await this.seasonReadRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Mùa giải không tồn tại');
    }
    return season;
  }
}
