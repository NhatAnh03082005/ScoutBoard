import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchPlayersUseCase } from 'src/modules/players/application/use-cases/search-players.use-case';
import { GetPlayerByIdUseCase } from 'src/modules/players/application/use-cases/get-player-by-id.use-case';
import { GetPlayerTeamHistoryUseCase } from 'src/modules/players/application/use-cases/get-player-team-history.use-case';
import { GetPlayerSeasonStatisticsUseCase } from 'src/modules/players/application/use-cases/get-player-season-statistics.use-case';
import { GetPlayerMatchStatisticsUseCase } from 'src/modules/players/application/use-cases/get-player-match-statistics.use-case';
import { GetComparisonCandidatesUseCase } from 'src/modules/players/application/use-cases/get-comparison-candidates.use-case';
import { SearchPlayersQueryDto } from '../dto/search-players-query.dto';
import { FindPlayerMatchStatisticsQueryDto } from '../dto/find-player-match-statistics-query.dto';
import { FindComparisonCandidatesQueryDto } from '../dto/find-comparison-candidates-query.dto';
import { PlayerListResponseDto } from '../dto/player-response.dto';
import { PlayerTeamHistoryResponseDto } from '../dto/player-team-history-response.dto';
import { PlayerSeasonStatisticResponseDto } from '../dto/player-season-statistic-response.dto';
import { PlayerMatchStatisticListResponseDto } from '../dto/player-match-statistic-response.dto';
import { UpdatePlayerPrimaryPositionDto } from '../dto/update-player-primary-position.dto';
import { UpdatePlayerPrimaryPositionUseCase } from 'src/modules/players/application/use-cases/update-player-primary-position.use-case';

@ApiTags('Players')
@Controller('players')
export class PlayersController {
  constructor(
    private readonly searchPlayersUseCase: SearchPlayersUseCase,
    private readonly getPlayerByIdUseCase: GetPlayerByIdUseCase,
    private readonly getPlayerTeamHistoryUseCase: GetPlayerTeamHistoryUseCase,
    private readonly getPlayerSeasonStatisticsUseCase: GetPlayerSeasonStatisticsUseCase,
    private readonly getPlayerMatchStatisticsUseCase: GetPlayerMatchStatisticsUseCase,
    private readonly getComparisonCandidatesUseCase: GetComparisonCandidatesUseCase,
    private readonly updatePlayerPrimaryPositionUseCase: UpdatePlayerPrimaryPositionUseCase,
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
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết cầu thủ',
  })
  @ApiResponse({
    status: 404,
    description: 'Cầu thủ không tồn tại',
  })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getPlayerByIdUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Cập nhật vị trí chính của cầu thủ' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật vị trí chính' })
  @ApiResponse({ status: 404, description: 'Cầu thủ không tồn tại' })
  @Patch(':id/primary-position')
  async updatePrimaryPosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePlayerPrimaryPositionDto,
  ) {
    return this.updatePlayerPrimaryPositionUseCase.execute({
      playerId: id,
      positionCode: body.positionCode.trim().toUpperCase(),
    });
  }

  @ApiOperation({
    summary: 'Lịch sử thi đấu / chuyển nhượng của cầu thủ qua các đội',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lịch sử thi đấu của cầu thủ qua các đội',
    type: [PlayerTeamHistoryResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Cầu thủ không tồn tại',
  })
  @Get(':id/team-history')
  async getTeamHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerTeamHistoryResponseDto[]> {
    return this.getPlayerTeamHistoryUseCase.execute(id);
  }

  @ApiOperation({
    summary: 'Thống kê chỉ số thi đấu theo mùa giải của cầu thủ',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách chỉ số thống kê theo mùa giải của cầu thủ',
    type: [PlayerSeasonStatisticResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Cầu thủ không tồn tại',
  })
  @Get(':id/season-statistics')
  async getSeasonStatistics(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerSeasonStatisticResponseDto[]> {
    return this.getPlayerSeasonStatisticsUseCase.execute(id);
  }

  @ApiOperation({
    summary: 'Thống kê chỉ số thi đấu chi tiết từng trận của cầu thủ',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách thống kê trận đấu có phân trang và bối cảnh trận đấu',
    type: PlayerMatchStatisticListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cầu thủ không tồn tại',
  })
  @Get(':id/match-statistics')
  async getMatchStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FindPlayerMatchStatisticsQueryDto,
  ): Promise<PlayerMatchStatisticListResponseDto> {
    return this.getPlayerMatchStatisticsUseCase.execute(id, query);
  }

  @ApiOperation({
    summary: 'Tìm kiếm ứng viên so sánh cầu thủ theo phạm vi bối cảnh',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách ứng viên so sánh có phân trang',
    type: PlayerListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số bối cảnh hoặc điều kiện lọc không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Cầu thủ gốc không tồn tại',
  })
  @Get(':id/comparison-candidates')
  async getComparisonCandidates(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FindComparisonCandidatesQueryDto,
  ): Promise<PlayerListResponseDto> {
    return this.getComparisonCandidatesUseCase.execute(id, query);
  }
}
