import { Injectable, Inject } from '@nestjs/common';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from '../ports/competition-read.repository';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

@Injectable()
export class ListCompetitionsUseCase {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
  ) {}

  async execute(): Promise<CompetitionOrmEntity[]> {
    return this.competitionReadRepository.findAll();
  }
}
