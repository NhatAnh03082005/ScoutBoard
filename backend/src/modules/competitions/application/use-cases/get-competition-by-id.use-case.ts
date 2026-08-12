import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from '../ports/competition-read.repository';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

@Injectable()
export class GetCompetitionByIdUseCase {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
  ) {}

  async execute(id: string): Promise<CompetitionOrmEntity> {
    const item = await this.competitionReadRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return item;
  }
}
