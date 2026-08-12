import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ListCompetitionsUseCase } from 'src/modules/competitions/application/use-cases/list-competitions.use-case';
import { GetCompetitionByIdUseCase } from 'src/modules/competitions/application/use-cases/get-competition-by-id.use-case';
import { GetSeasonsByCompetitionUseCase } from 'src/modules/competitions/application/use-cases/get-seasons-by-competition.use-case';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from 'src/modules/competitions/application/use-cases/get-current-season-teams-by-competition.use-case';
import { CompetitionTeamResponseDto } from '../dto/competition-team-response.dto';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly listCompetitionsUseCase: ListCompetitionsUseCase,
    private readonly getCompetitionByIdUseCase: GetCompetitionByIdUseCase,
    private readonly getSeasonsByCompetitionUseCase: GetSeasonsByCompetitionUseCase,
    private readonly getCurrentSeasonTeamsByCompetitionUseCase: GetCurrentSeasonTeamsByCompetitionUseCase,
  ) {}

  @ApiOperation({ summary: 'Danh sách tất cả giải đấu' })
  @Get()
  async findAll() {
    return this.listCompetitionsUseCase.execute();
  }

  @ApiOperation({ summary: 'Chi tiết giải đấu' })
  @ApiParam({
    name: 'id',
    description: 'ID của giải đấu (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCompetitionByIdUseCase.execute(id);
  }

  @ApiOperation({ summary: 'Danh sách mùa giải của một giải đấu' })
  @ApiParam({
    name: 'id',
    description: 'ID của giải đấu (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @Get(':id/seasons')
  async findSeasonsByCompetitionId(@Param('id', ParseUUIDPipe) id: string) {
    return this.getSeasonsByCompetitionUseCase.execute(id);
  }

  @ApiOperation({
    summary: 'Danh sách đội bóng thuộc mùa giải hiện tại của một giải đấu',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của giải đấu (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đội bóng mùa hiện tại',
    type: [CompetitionTeamResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Giải đấu không tồn tại hoặc không có mùa giải hiện tại',
  })
  @Get(':id/teams')
  async findCurrentSeasonTeams(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCurrentSeasonTeamsByCompetitionUseCase.execute(id);
  }
}
