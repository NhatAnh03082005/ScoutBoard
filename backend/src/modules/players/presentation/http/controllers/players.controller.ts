import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchPlayersUseCase } from 'src/modules/players/application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from 'src/modules/players/application/use-cases/get-player-by-id.use-case';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';
import { PlayerListResponseDto } from '../dto/player-response.dto';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly searchPlayersUseCase: SearchPlayersUseCase,
    private readonly getPlayerByIdUseCase: GetPlayerByIdUseCase,
  ) {}

  @ApiOperation({ summary: 'Tìm kiếm & danh sách cầu thủ cơ bản' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cầu thủ có phân trang',
    type: PlayerListResponseDto,
  })
  @Get()
  async search(
    @Query() query: SearchPlayersQueryDto,
  ): Promise<PlayerListResponseDto> {
    return this.searchPlayersUseCase.execute(query);
  }

  @ApiOperation({ summary: 'Chi tiết cầu thủ' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getPlayerByIdUseCase.execute(id);
  }
}
