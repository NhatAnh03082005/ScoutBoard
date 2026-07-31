import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  TEAM_READ_REPOSITORY,
  TeamReadRepository,
} from 'src/modules/teams/application/ports/team-read.repository';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    @Inject(TEAM_READ_REPOSITORY)
    private readonly teamReadRepository: TeamReadRepository,
  ) {}

  @ApiOperation({ summary: 'Danh sách đội bóng' })
  @Get()
  async findAll() {
    return this.teamReadRepository.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết đội bóng' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const team = await this.teamReadRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Đội bóng không tồn tại');
    }
    return team;
  }
}
