/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id.use-case';
import { ListUsersAdminUseCase } from '../../../application/use-cases/list-users-admin.use-case';
import { UpdateUserStatusUseCase } from '../../../application/use-cases/update-user-status.use-case';
import { UnlockUserUseCase } from '../../../application/use-cases/unlock-user.use-case';
import { UpdateUserRolesUseCase } from '../../../application/use-cases/update-user-roles.use-case';
import { User } from '../../../domain/entities/user';
import { CannotDisableSelfError } from '../../../domain/errors/users.errors';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/presentation/http/guards/roles.guard';
import { AuthenticatedUser } from '../../../../auth/presentation/http/strategies/jwt.strategy';
import { UserStatusEnum } from '../dto/admin-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let getUserByIdUseCase: jest.Mocked<GetUserByIdUseCase>;
  let listUsersAdminUseCase: jest.Mocked<ListUsersAdminUseCase>;
  let updateUserStatusUseCase: jest.Mocked<UpdateUserStatusUseCase>;
  let unlockUserUseCase: jest.Mocked<UnlockUserUseCase>;
  let updateUserRolesUseCase: jest.Mocked<UpdateUserRolesUseCase>;

  beforeEach(async () => {
    const mockGetUserById = { execute: jest.fn() };
    const mockListUsersAdmin = { execute: jest.fn() };
    const mockUpdateUserStatus = { execute: jest.fn() };
    const mockUnlockUser = { execute: jest.fn() };
    const mockUpdateUserRoles = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: GetUserByIdUseCase, useValue: mockGetUserById },
        { provide: ListUsersAdminUseCase, useValue: mockListUsersAdmin },
        { provide: UpdateUserStatusUseCase, useValue: mockUpdateUserStatus },
        { provide: UnlockUserUseCase, useValue: mockUnlockUser },
        { provide: UpdateUserRolesUseCase, useValue: mockUpdateUserRoles },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    getUserByIdUseCase = module.get(GetUserByIdUseCase);
    listUsersAdminUseCase = module.get(ListUsersAdminUseCase);
    updateUserStatusUseCase = module.get(UpdateUserStatusUseCase);
    unlockUserUseCase = module.get(UnlockUserUseCase);
    updateUserRolesUseCase = module.get(UpdateUserRolesUseCase);
  });

  describe('GET /admin/users', () => {
    it('should list users via ListUsersAdminUseCase', async () => {
      listUsersAdminUseCase.execute.mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(listUsersAdminUseCase.execute).toHaveBeenCalledWith({});
      expect(result).toEqual([]);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      getUserByIdUseCase.execute.mockResolvedValue(null);

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return sanitized user profile if found', async () => {
      const user = new User(
        'user-1',
        'user@example.com',
        'hash',
        'Test User',
        'ACTIVE',
      );
      getUserByIdUseCase.execute.mockResolvedValue(user);

      const result = await controller.findOne('user-1');

      expect(result.email).toBe('user@example.com');
      expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('should throw BadRequestException if admin tries to disable self', async () => {
      updateUserStatusUseCase.execute.mockRejectedValue(
        new CannotDisableSelfError(),
      );

      const authUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@scoutboard.com',
        fullName: 'Admin',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        userRoles: [{ role: { code: 'ADMIN', name: 'Admin' } }],
      };

      const req = { user: authUser };

      await expect(
        controller.updateStatus(
          'admin-1',
          { status: UserStatusEnum.DISABLED },
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /admin/users/:id/unlock', () => {
    it('should unlock user and return sanitized profile', async () => {
      const unlockedUser = new User(
        'user-1',
        'user@example.com',
        'hash',
        'User One',
        'ACTIVE',
      );
      unlockUserUseCase.execute.mockResolvedValue(unlockedUser);

      const result = await controller.unlockUser('user-1');

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('PATCH /admin/users/:id/roles', () => {
    it('should update user roles and return sanitized profile', async () => {
      const updatedUser = new User(
        'user-1',
        'user@example.com',
        'hash',
        'User One',
        'ACTIVE',
      );
      updateUserRolesUseCase.execute.mockResolvedValue(updatedUser);

      const result = await controller.updateRoles('user-1', {
        roles: ['USER', 'ADMIN'],
      });

      expect(updateUserRolesUseCase.execute).toHaveBeenCalledWith({
        targetUserId: 'user-1',
        roles: ['USER', 'ADMIN'],
      });
      expect(result.email).toBe('user@example.com');
    });
  });
});
