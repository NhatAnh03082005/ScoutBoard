import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from '../ports/competition-read.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';
import {
  TEAM_READ_REPOSITORY,
  TeamReadRepository,
} from 'src/modules/teams/application/ports/team-read.repository';
import { CompetitionTeamResponseDto } from '../../presentation/http/dto/competition-team-response.dto';

@Injectable()
export class GetCurrentSeasonTeamsByCompetitionUseCase {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
    @Inject(TEAM_READ_REPOSITORY)
    private readonly teamReadRepository: TeamReadRepository,
  ) {}

  async execute(competitionId: string): Promise<CompetitionTeamResponseDto[]> {
    const competition =
      await this.competitionReadRepository.findById(competitionId);
    if (!competition) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }

    const currentSeason =
      await this.seasonReadRepository.findCurrentByCompetitionId(competitionId);
    if (!currentSeason) {
      throw new NotFoundException(
        'Không tìm thấy mùa giải hiện tại của giải đấu',
      );
    }

    const teams = await this.teamReadRepository.findBySeasonId(
      currentSeason.id,
    );
    if (!teams || teams.length === 0) {
      return [];
    }

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      country: team.country,
      logoUrl: team.logoUrl,
    }));
  }
}
