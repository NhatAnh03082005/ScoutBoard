import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from 'src/modules/competitions/application/ports/competition-read.repository';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
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
  async findOne(@Param('id') id: string) {
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
  async findSeasonsByCompetitionId(@Param('id') id: string) {
    const competition = await this.competitionReadRepository.findById(id);
    if (!competition) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return this.seasonReadRepository.findByCompetition(id);
  }
}
