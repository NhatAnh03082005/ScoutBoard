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
import { ComparisonScope } from '../../domain/enums/comparison-scope.enum';
import { FindComparisonCandidatesQueryDto } from '../../presentation/http/dto/find-comparison-candidates-query.dto';
import {
  PlayerListResponseDto,
  PlayerItemDto,
} from '../../presentation/http/dto/player-response.dto';

@Injectable()
export class GetComparisonCandidatesUseCase {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  async execute(
    currentPlayerId: string,
    query: FindComparisonCandidatesQueryDto,
  ): Promise<PlayerListResponseDto> {
    const currentPlayer =
      await this.playerReadRepository.findById(currentPlayerId);
    if (!currentPlayer) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }

    if (query.scope === ComparisonScope.COMPETITION && !query.competitionId) {
      throw new BadRequestException(
        'competitionId là bắt buộc khi chọn phạm vi COMPETITION',
      );
    }

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

    // 1. Extract all unique positions of Player A (Primary + Secondary)
    const playerAPositions = new Set<string>();
    if (currentPlayer.primaryPosition) {
      playerAPositions.add(currentPlayer.primaryPosition.trim());
    }
    (currentPlayer.positions || []).forEach((p) => {
      if (p.positionCode) {
        playerAPositions.add(p.positionCode.trim());
      }
    });
    const compatiblePositions = Array.from(playerAPositions);

    // If Player A has no positions recorded, return empty list
    if (compatiblePositions.length === 0) {
      return {
        items: [],
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: 0,
        },
      };
    }

    // 2. If a specific position filter was requested, verify it is in Player A's compatible positions
    if (query.position && query.position.trim() !== '') {
      const requestedPos = query.position.trim();
      if (!compatiblePositions.includes(requestedPos)) {
        return {
          items: [],
          pagination: {
            limit: query.limit,
            offset: query.offset,
            total: 0,
          },
        };
      }
    }

    const { items, total } =
      await this.playerReadRepository.findComparisonCandidates(
        currentPlayerId,
        {
          ...query,
          compatiblePositions,
        },
      );

    const mappedItems: PlayerItemDto[] = items.map((player) => ({
      id: player.id,
      fullName: player.name,
      imageUrl: player.imageUrl,
      dateOfBirth: player.dateOfBirth,
      nationality: player.nationality,
      preferredFoot: player.preferredFoot,
      heightCm: player.heightCm,
      primaryPosition: player.primaryPosition,
      positions: (player.positions || []).map((position) => ({
        id: position.id,
        positionCode: position.positionCode,
        isPrimary: position.isPrimary,
      })),
      shirtNumber: player.shirtNumber,
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
