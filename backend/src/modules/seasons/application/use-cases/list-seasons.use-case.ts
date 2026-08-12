import { Injectable, Inject } from '@nestjs/common';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from '../ports/season-read.repository';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

@Injectable()
export class ListSeasonsUseCase {
  constructor(
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
  ) {}

  async execute(competitionId?: string): Promise<SeasonOrmEntity[]> {
    return this.seasonReadRepository.findAll(competitionId);
  }
}
