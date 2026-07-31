import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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

  @ApiOperation({ summary: 'Chi tiết mùa giải' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const season = await this.seasonReadRepository.findById(id);
    if (!season) {
      throw new NotFoundException('Mùa giải không tồn tại');
    }
    return season;
  }
}
