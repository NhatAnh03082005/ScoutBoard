import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from 'src/modules/competitions/application/ports/competition-read.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from 'src/modules/competitions/application/use-cases/get-current-season-teams-by-competition.use-case';
import { CompetitionTeamResponseDto } from '../dto/competition-team-response.dto';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
    private readonly getCurrentSeasonTeamsByCompetitionUseCase: GetCurrentSeasonTeamsByCompetitionUseCase,
  ) {}

  @ApiOperation({ summary: 'Danh sách tất cả giải đấu' })
  @Get()
  async findAll() {
    return this.competitionReadRepository.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết giải đấu' })
  @ApiParam({
    name: 'id',
    description: 'ID của giải đấu (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.competitionReadRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return item;
  }

  @ApiOperation({ summary: 'Danh sách mùa giải của một giải đấu' })
  @ApiParam({
    name: 'id',
    description: 'ID của giải đấu (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @Get(':id/seasons')
  async findSeasonsByCompetitionId(@Param('id', ParseUUIDPipe) id: string) {
    const competition = await this.competitionReadRepository.findById(id);
    if (!competition) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return this.seasonReadRepository.findByCompetition(id);
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
