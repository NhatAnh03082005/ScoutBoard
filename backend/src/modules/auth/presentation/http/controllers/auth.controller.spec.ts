import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { RegisterUseCase } from '../../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { RefreshTokensUseCase } from '../../../application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AccountHasNoRolesError } from '../../../domain/errors/auth.errors';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('AuthController', () => {
  let controller: AuthController;
  let loginUseCase: jest.Mocked<LoginUseCase>;
  let rolesGuard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockRegisterUseCase = { execute: jest.fn() };
    const mockLoginUseCase = { execute: jest.fn() };
    const mockRefreshTokensUseCase = { execute: jest.fn() };
    const mockLogoutUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUseCase, useValue: mockRegisterUseCase },
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: RefreshTokensUseCase, useValue: mockRefreshTokensUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    loginUseCase = module.get(LoginUseCase);

    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    rolesGuard = new RolesGuard(reflector);
  });

  describe('GET /auth/me profile contract', () => {
    it('should return profile with roles array for ADMIN user', () => {
      const authUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@scoutboard.com',
        fullName: 'Admin User',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        userRoles: [{ role: { code: 'ADMIN', name: 'Admin' } }],
      };

      const req = { user: authUser };
      const result = controller.getProfile(req);

      expect(result.roles).toEqual(['ADMIN']);
      expect(result.roles.includes('ADMIN')).toBe(true);
    });

    it('should return profile with roles array for USER user', () => {
      const authUser: AuthenticatedUser = {
        id: 'user-1',
        email: 'user@scoutboard.com',
        fullName: 'Regular User',
        status: 'ACTIVE',
        roles: ['USER'],
        userRoles: [{ role: { code: 'USER', name: 'User' } }],
      };

      const req = { user: authUser };
      const result = controller.getProfile(req);

      expect(result.roles).toEqual(['USER']);
      expect(result.roles.includes('ADMIN')).toBe(false);
    });
  });

  describe('Login Role Handling', () => {
    it('should throw ForbiddenException if user has no roles', async () => {
      loginUseCase.execute.mockRejectedValue(
        new AccountHasNoRolesError('Tài khoản chưa được phân quyền'),
      );

      await expect(
        controller.login({
          email: 'norole@scoutboard.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('RolesGuard Behavior', () => {
    it('should allow access if user has required ADMIN role', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: ['ADMIN'],
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(rolesGuard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks required ADMIN role', () => {
      reflector.getAllAndOverride.mockReturnValue(['ADMIN']);

      const mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              roles: ['USER'],
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => rolesGuard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });
  });
});
