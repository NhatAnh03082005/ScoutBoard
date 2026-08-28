import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  SEASON_TEAM_WRITE_REPOSITORY,
  SeasonTeamWriteRepository,
} from '../ports/season-team-write.repository';
import { SeasonTeamOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season-team.orm-entity';

export interface PersistSeasonTeamsInput {
  seasonId: string;
  teamIds: string[];
}

export interface PersistSeasonTeamsResult {
  seasonId: string;
  totalLinked: number;
  seasonTeams: SeasonTeamOrmEntity[];
}

@Injectable()
export class PersistSeasonTeamsUseCase {
  constructor(
    @Inject(SEASON_TEAM_WRITE_REPOSITORY)
    private readonly seasonTeamWriteRepository: SeasonTeamWriteRepository,
  ) {}

  async execute(input: PersistSeasonTeamsInput): Promise<PersistSeasonTeamsResult> {
    if (!input) {
      throw new BadRequestException('Input is required');
    }

    if (!input.seasonId || String(input.seasonId).trim() === '') {
      throw new BadRequestException('seasonId is required');
    }

    if (!Array.isArray(input.teamIds) || input.teamIds.length === 0) {
      return {
        seasonId: input.seasonId.trim(),
        totalLinked: 0,
        seasonTeams: [],
      };
    }

    const validTeamIds = input.teamIds
      .map((id) => String(id || '').trim())
      .filter((id) => id !== '');

    if (validTeamIds.length === 0) {
      return {
        seasonId: input.seasonId.trim(),
        totalLinked: 0,
        seasonTeams: [],
      };
    }

    const seasonTeams = await this.seasonTeamWriteRepository.addTeamsToSeason(
      input.seasonId.trim(),
      validTeamIds,
    );

    return {
      seasonId: input.seasonId.trim(),
      totalLinked: seasonTeams.length,
      seasonTeams,
    };
  }
}
