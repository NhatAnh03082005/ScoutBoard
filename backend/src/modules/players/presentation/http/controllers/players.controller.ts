import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from 'src/modules/players/application/ports/player-read.repository';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';
import {
  PlayerListResponseDto,
  PlayerItemDto,
} from '../dto/player-response.dto';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  @ApiOperation({ summary: 'Tìm kiếm & danh sách cầu thủ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cầu thủ có phân trang',
    type: PlayerListResponseDto,
  })
  @Get()
  async search(
    @Query() query: SearchPlayersQueryDto,
  ): Promise<PlayerListResponseDto> {
    const { items, total } = await this.playerReadRepository.search(query);

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

  @ApiOperation({ summary: 'Chi tiết cầu thủ' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const player = await this.playerReadRepository.findById(id);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }
    return player;
  }
}
