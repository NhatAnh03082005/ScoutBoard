import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  SEASON_WRITE_REPOSITORY,
  SeasonWriteRepository,
} from '../ports/season-write.repository';
import { TransformedSeason } from '../../../external-football/domain/models/transformed-competition.model';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

@Injectable()
export class PersistSeasonUseCase {
  constructor(
    @Inject(SEASON_WRITE_REPOSITORY)
    private readonly seasonWriteRepository: SeasonWriteRepository,
  ) {}

  async execute(
    season: TransformedSeason,
    competitionId: string,
  ): Promise<SeasonOrmEntity> {
    this.validate(season, competitionId);
    return this.seasonWriteRepository.upsert(season, competitionId);
  }

  async executeMany(
    seasons: TransformedSeason[],
    competitionId: string,
  ): Promise<SeasonOrmEntity[]> {
    if (!competitionId || String(competitionId).trim() === '') {
      throw new BadRequestException('competitionId is required');
    }

    if (!Array.isArray(seasons)) {
      throw new BadRequestException('seasons must be an array');
    }

    for (const season of seasons) {
      this.validate(season, competitionId);
    }

    return this.seasonWriteRepository.upsertMany(seasons, competitionId);
  }

  private validate(season: TransformedSeason, competitionId: string): void {
    if (!competitionId || String(competitionId).trim() === '') {
      throw new BadRequestException('competitionId is required');
    }

    if (!season) {
      throw new BadRequestException('Season payload is required');
    }

    if (!season.externalProvider || String(season.externalProvider).trim() === '') {
      throw new BadRequestException('externalProvider is required');
    }

    if (!season.externalId || String(season.externalId).trim() === '') {
      throw new BadRequestException('externalId is required');
    }

    if (!season.name || String(season.name).trim() === '') {
      throw new BadRequestException('Season name is required');
    }
  }
}
