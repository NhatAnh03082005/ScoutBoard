import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ListSeasonsUseCase } from 'src/modules/seasons/application/use-cases/list-seasons.use-case';
import { GetSeasonByIdUseCase } from 'src/modules/seasons/application/use-cases/get-season-by-id.use-case';

@ApiTags('Seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(
    private readonly listSeasonsUseCase: ListSeasonsUseCase,
    private readonly getSeasonByIdUseCase: GetSeasonByIdUseCase,
  ) {}

  @ApiOperation({ summary: 'Danh sách mùa giải' })
  @ApiQuery({
    name: 'competitionId',
    required: false,
    description: 'Lọc mùa giải theo ID giải đấu',
  })
  @Get()
  async findAll(@Query('competitionId') competitionId?: string) {
    return this.listSeasonsUseCase.execute(competitionId);
  }

  @ApiOperation({ summary: 'Chi tiết mùa giải' })
  @ApiParam({
    name: 'id',
    description: 'ID của mùa giải (UUID)',
    example: 'f81c9a01-b2c3-4d5e-6f7a-8b9c0d1e2f3a',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.getSeasonByIdUseCase.execute(id);
  }
}
