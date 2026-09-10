import { Injectable, BadRequestException } from '@nestjs/common';
import { PersistCompetitionUseCase } from './persist-competition.use-case';
import { PersistSeasonUseCase } from '../../../seasons/application/use-cases/persist-season.use-case';
import { TransformedCompetition } from '../../../external-football/domain/models/transformed-competition.model';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../../seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';

export interface PersistCompetitionWithSeasonsResult {
  competitionId: string;
  competition: CompetitionOrmEntity;
  seasonsPersisted: number;
  seasons: SeasonOrmEntity[];
}

@Injectable()
export class PersistCompetitionWithSeasonsUseCase {
  constructor(
    private readonly persistCompetitionUseCase: PersistCompetitionUseCase,
    private readonly persistSeasonUseCase: PersistSeasonUseCase,
  ) {}

  async execute(
    input: TransformedCompetition,
  ): Promise<PersistCompetitionWithSeasonsResult> {
    if (!input) {
      throw new BadRequestException(
        'Transformed competition payload is required',
      );
    }

    if (
      !input.externalProvider ||
      String(input.externalProvider).trim() === ''
    ) {
      throw new BadRequestException('externalProvider is required');
    }

    if (!input.externalId || String(input.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!input.name || String(input.name).trim() === '') {
      throw new BadRequestException('Competition name is required');
    }

    // 1. Persist Competition first
    const competition = await this.persistCompetitionUseCase.execute(input);

    const competitionId = competition.id;
    if (!competitionId) {
      throw new Error(
        'Competition persistence succeeded but returned empty internal ID',
      );
    }

    // 2. Persist Seasons if present
    let seasons: SeasonOrmEntity[] = [];
    if (Array.isArray(input.seasons) && input.seasons.length > 0) {
      seasons = await this.persistSeasonUseCase.executeMany(
        input.seasons,
        competitionId,
      );
    }

    return {
      competitionId,
      competition,
      seasonsPersisted: seasons.length,
      seasons,
    };
  }
}
