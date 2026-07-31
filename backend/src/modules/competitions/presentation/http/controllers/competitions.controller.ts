import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  COMPETITION_READ_REPOSITORY,
  CompetitionReadRepository,
} from 'src/modules/competitions/application/ports/competition-read.repository';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    @Inject(COMPETITION_READ_REPOSITORY)
    private readonly competitionReadRepository: CompetitionReadRepository,
  ) {}

  @ApiOperation({ summary: 'Danh sách giải đấu' })
  @Get()
  async findAll() {
    return this.competitionReadRepository.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết giải đấu' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const item = await this.competitionReadRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Giải đấu không tồn tại');
    }
    return item;
  }
}
