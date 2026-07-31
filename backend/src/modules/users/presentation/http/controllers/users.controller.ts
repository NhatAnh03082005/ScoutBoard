import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../../auth/presentation/http/decorators/roles.decorator';
import {
  UserQueryDto,
  UpdateUserStatusDto,
  UpdateUserRolesDto,
} from '../dto/admin-user.dto';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id.use-case';
import { ListUsersAdminUseCase } from '../../../application/use-cases/list-users-admin.use-case';
import { UpdateUserStatusUseCase } from '../../../application/use-cases/update-user-status.use-case';
import { UnlockUserUseCase } from '../../../application/use-cases/unlock-user.use-case';
import { UpdateUserRolesUseCase } from '../../../application/use-cases/update-user-roles.use-case';
import {
  CannotDisableSelfError,
  UserNotFoundError,
  InvalidRoleError,
} from '../../../domain/errors/users.errors';

interface RequestWithAuthUser {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    roles: string[];
  };
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly listUsersAdminUseCase: ListUsersAdminUseCase,
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    private readonly unlockUserUseCase: UnlockUserUseCase,
    private readonly updateUserRolesUseCase: UpdateUserRolesUseCase,
  ) {}

  @Get()
  async findAll(@Query() query: UserQueryDto) {
    return this.listUsersAdminUseCase.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) {
      throw new NotFoundException('Tài khoản người dùng không tồn tại');
    }
    return user.sanitize();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: RequestWithAuthUser,
  ) {
    try {
      const updatedUser = await this.updateUserStatusUseCase.execute({
        targetUserId: id,
        status: dto.status,
        adminId: req.user.id,
      });
      return updatedUser.sanitize();
    } catch (err) {
      if (err instanceof CannotDisableSelfError) {
        throw new BadRequestException(err.message);
      }
      if (err instanceof UserNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/unlock')
  async unlockUser(@Param('id') id: string) {
    try {
      const updatedUser = await this.unlockUserUseCase.execute(id);
      return updatedUser.sanitize();
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  @Patch(':id/roles')
  async updateRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto) {
    try {
      const updatedUser = await this.updateUserRolesUseCase.execute({
        targetUserId: id,
        roles: dto.roles,
      });
      return updatedUser.sanitize();
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof InvalidRoleError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
