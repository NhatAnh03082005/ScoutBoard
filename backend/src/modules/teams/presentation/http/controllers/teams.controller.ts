import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ListTeamsUseCase } from 'src/modules/teams/application/use-cases/list-teams.use-case';
import { GetTeamByIdUseCase } from 'src/modules/teams/application/use-cases/get-team-by-id.use-case';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly getTeamByIdUseCase: GetTeamByIdUseCase,
  ) {}

  @ApiOperation({ summary: 'Danh sách đội bóng' })
  @Get()
  async findAll() {
    return this.listTeamsUseCase.execute();
  }

  @ApiOperation({ summary: 'Chi tiết đội bóng' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.getTeamByIdUseCase.execute(id);
  }
}
