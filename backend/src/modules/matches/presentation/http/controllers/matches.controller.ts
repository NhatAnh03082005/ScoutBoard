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
  MATCH_READ_REPOSITORY,
  MatchReadRepository,
} from 'src/modules/matches/application/ports/match-read.repository';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(
    @Inject(MATCH_READ_REPOSITORY)
    private readonly matchReadRepository: MatchReadRepository,
  ) {}

  @ApiOperation({ summary: 'Danh sách trận đấu theo giải & mùa giải' })
  @Get()
  async findByCompetitionAndSeason(
    @Query('competitionId') competitionId: string,
    @Query('seasonId') seasonId: string,
  ) {
    if (!competitionId || !seasonId) {
      return [];
    }
    return this.matchReadRepository.findByCompetitionAndSeason(
      competitionId,
      seasonId,
    );
  }

  @ApiOperation({ summary: 'Chi tiết trận đấu' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const match = await this.matchReadRepository.findById(id);
    if (!match) {
      throw new NotFoundException('Trận đấu không tồn tại');
    }
    return match;
  }
}
