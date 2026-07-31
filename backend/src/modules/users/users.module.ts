import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/typeorm/entities/user.orm-entity';
import { RoleOrmEntity } from './infrastructure/persistence/typeorm/entities/role.orm-entity';
import { UserRoleOrmEntity } from './infrastructure/persistence/typeorm/entities/user-role.orm-entity';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from './application/use-cases/get-user-by-email.use-case';
import { ListUsersAdminUseCase } from './application/use-cases/list-users-admin.use-case';
import { UpdateUserStatusUseCase } from './application/use-cases/update-user-status.use-case';
import { UnlockUserUseCase } from './application/use-cases/unlock-user.use-case';
import { UpdateUserRolesUseCase } from './application/use-cases/update-user-roles.use-case';
import { UsersController } from './presentation/http/controllers/users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, RoleOrmEntity, UserRoleOrmEntity]),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    CreateUserUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
    ListUsersAdminUseCase,
    UpdateUserStatusUseCase,
    UnlockUserUseCase,
    UpdateUserRolesUseCase,
  ],
  exports: [
    USER_REPOSITORY,
    CreateUserUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
  ],
})
export class UsersModule {}
