import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  COMPETITION_WRITE_REPOSITORY,
  CompetitionWriteRepository,
} from '../ports/competition-write.repository';
import { TransformedCompetition } from '../../../external-football/domain/models/transformed-competition.model';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

@Injectable()
export class PersistCompetitionUseCase {
  constructor(
    @Inject(COMPETITION_WRITE_REPOSITORY)
    private readonly competitionWriteRepository: CompetitionWriteRepository,
  ) {}

  async execute(input: TransformedCompetition): Promise<CompetitionOrmEntity> {
    if (!input) {
      throw new BadRequestException('Transformed competition payload is required');
    }

    if (!input.externalProvider || String(input.externalProvider).trim() === '') {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!input.name || String(input.name).trim() === '') {
      throw new BadRequestException('Competition name is required');
    }

    return this.competitionWriteRepository.upsert(input);
  }
}
