import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  PLAYER_READ_REPOSITORY,
  PlayerReadRepository,
} from 'src/modules/players/application/ports/player-read.repository';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    @Inject(PLAYER_READ_REPOSITORY)
    private readonly playerReadRepository: PlayerReadRepository,
  ) {}

  @ApiOperation({ summary: 'Tìm kiếm & danh sách cầu thủ' })
  @Get()
  async search(
    @Query('search') search?: string,
    @Query('teamId') teamId?: string,
    @Query('position') position?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.playerReadRepository.search({
      search,
      teamId,
      position,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
  }

  @ApiOperation({ summary: 'Chi tiết cầu thủ' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const player = await this.playerReadRepository.findById(id);
    if (!player) {
      throw new NotFoundException('Cầu thủ không tồn tại');
    }
    return player;
  }
}
