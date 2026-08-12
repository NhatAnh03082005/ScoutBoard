import { Injectable, Inject } from '@nestjs/common';
import {
  MATCH_READ_REPOSITORY,
  MatchReadRepository,
} from '../ports/match-read.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';

@Injectable()
export class ListMatchesUseCase {
  constructor(
    @Inject(MATCH_READ_REPOSITORY)
    private readonly matchReadRepository: MatchReadRepository,
  ) {}

  async execute(
    competitionId: string,
    seasonId: string,
  ): Promise<MatchOrmEntity[]> {
    if (!competitionId || !seasonId) {
      return [];
    }
    return this.matchReadRepository.findByCompetitionAndSeason(
      competitionId,
      seasonId,
    );
  }
}
