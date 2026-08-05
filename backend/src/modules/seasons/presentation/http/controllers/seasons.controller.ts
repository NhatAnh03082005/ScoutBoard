import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import {
  SEASON_READ_REPOSITORY,
  SeasonReadRepository,
} from 'src/modules/seasons/application/ports/season-read.repository';

@ApiTags('Seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(
    @Inject(SEASON_READ_REPOSITORY)
    private readonly seasonReadRepository: SeasonReadRepository,
  ) {}

  @ApiOperation({ summary: 'Danh sách mùa giải' })
  @ApiQuery({
    name: 'competitionId',
    required: false,
    description: 'Lọc mùa giải theo ID giải đấu',
  })
  @Get()
  async findAll(@Query('competitionId') competitionId?: string) {
    return this.seasonReadRepository.findAll(competitionId);
  }

  @ApiOperation({ summary: 'Chi tiết mùa giải' })
  @ApiParam({
    name: 'id',
    description: 'ID của mùa giải (UUID)',
    example: 'f81c9a01-b2c3-4d5e-6f7a-8b9c0d1e2f3a',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const season = await this.seasonReadRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Mùa giải không tồn tại');
    }
    return season;
  }
}
