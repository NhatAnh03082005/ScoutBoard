import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UserQueryDto,
  UpdateUserStatusDto,
  UpdateUserRolesDto,
} from './dto/admin-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAllForAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    return this.usersService.updateStatus(id, dto.status, req.user.id);
  }

  @Patch(':id/unlock')
  async unlockUser(@Param('id') id: string) {
    return this.usersService.unlockUser(id);
  }

  @Patch(':id/roles')
  async updateRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.usersService.updateRoles(id, dto.roles);
  }
}
