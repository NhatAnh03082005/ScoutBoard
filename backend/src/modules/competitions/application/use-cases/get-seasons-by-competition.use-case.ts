import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from '../ports/competition-read.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

@Injectable()
export class GetSeasonsByCompetitionUseCase {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
  ) {}

  async execute(competitionId: string): Promise<SeasonOrmEntity[]> {
    const competition =
      await this.competitionReadRepository.findById(competitionId);
    if (!competition) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return this.seasonReadRepository.findByCompetition(competitionId);
  }
}
