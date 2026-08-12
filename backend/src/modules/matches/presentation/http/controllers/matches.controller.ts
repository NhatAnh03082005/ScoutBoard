import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ListMatchesUseCase } from 'src/modules/matches/application/use-cases/list-matches.use-case';
import { GetMatchByIdUseCase } from 'src/modules/matches/application/use-cases/get-match-by-id.use-case';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly getMatchByIdUseCase: GetMatchByIdUseCase,
  ) {}

  @ApiOperation({ summary: 'Danh sách trận đấu theo giải & mùa giải' })
  @Get()
  async findByCompetitionAndSeason(
    @Query('competitionId') competitionId: string,
    @Query('seasonId') seasonId: string,
  ) {
    return this.listMatchesUseCase.execute(competitionId, seasonId);
  }

  @ApiOperation({ summary: 'Chi tiết trận đấu' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.getMatchByIdUseCase.execute(id);
  }
}
