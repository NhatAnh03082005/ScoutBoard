import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from '../ports/player-read.repository';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from 'src/modules/competitions/application/ports/competition-read.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';
import { SearchPlayersQueryDto } from '../../presentation/http/dto/search-players-query.dto';
import {
  PlayerListResponseDto,
  PlayerItemDto,
} from '../../presentation/http/dto/player-response.dto';

@Injectable()
export class SearchPlayersUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
  ) {}

  async execute(query: SearchPlayersQueryDto): Promise<PlayerListResponseDto> {
    if (
      query.minAge !== undefined &&
      query.maxAge !== undefined &&
      query.minAge > query.maxAge
    ) {
      throw new BadRequestException('minAge không được lớn hơn maxAge');
    }

    if (
      query.minHeightCm !== undefined &&
      query.maxHeightCm !== undefined &&
      query.minHeightCm > query.maxHeightCm
    ) {
      throw new BadRequestException(
        'minHeightCm không được lớn hơn maxHeightCm',
      );
    }

    let currentSeasonId: string | undefined = undefined;

    if (query.competitionId) {
      const competition = await this.competitionReadRepository.findById(
        query.competitionId,
      );
      if (!competition) {
        throw new NotFoundException('Giải đấu không tồn tại');
      }

      const currentSeason =
        await this.seasonReadRepository.findCurrentByCompetitionId(
          query.competitionId,
        );
      if (!currentSeason) {
        throw new NotFoundException(
          'Không tìm thấy mùa giải hiện tại của giải đấu',
        );
      }

      currentSeasonId = currentSeason.id;
    }

    const { items, total } = await this.playerReadRepository.search({
      ...query,
      currentSeasonId,
    });

    const mappedItems: PlayerItemDto[] = items.map((player) => ({
      id: player.id,
      fullName: player.name,
      imageUrl: player.imageUrl,
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality,
      preferredFoot: player.preferredFoot,
      heightCm: player.heightCm,
      primaryPosition: player.primaryPosition,
      currentTeam: player.currentTeam
        ? {
            id: player.currentTeam.id,
            name: player.currentTeam.name,
            shortName: player.currentTeam.shortName,
            logoUrl: player.currentTeam.logoUrl,
            country: player.currentTeam.country,
          }
        : null,
    }));

    return {
      items: mappedItems,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total,
      },
    };
  }
}
