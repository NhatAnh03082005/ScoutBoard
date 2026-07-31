/* eslint-disable @typescript-eslint/unbound-method */
import { RegisterUseCase } from './register.use-case';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.use-case';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenService } from '../ports/token-service.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { User } from '../../../users/domain/entities/user';
import { Role } from '../../../users/domain/entities/role';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  beforeEach(() => {
    mockCreateUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateUserUseCase>;

    mockPasswordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findByHashAndUserId: jest.fn(),
      findByHash: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    useCase = new RegisterUseCase(
      mockCreateUserUseCase,
      mockPasswordHasher,
      mockTokenService,
      mockRefreshTokenRepository,
    );
  });

  it('should hash password, create user, generate tokens and save refresh token', async () => {
    const roleUser = new Role('role-1', 'USER', 'User');
    const createdUser = new User(
      'user-1',
      'test@example.com',
      'hashed_pass',
      'Test User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [roleUser],
    );

    mockPasswordHasher.hash.mockResolvedValue('hashed_pass');
    mockCreateUserUseCase.execute.mockResolvedValue(createdUser);
    mockTokenService.generateTokens.mockResolvedValue({
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
    });

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    });

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('password123');
    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
      email: 'test@example.com',
      passwordHash: 'hashed_pass',
      fullName: 'Test User',
    });
    expect(mockTokenService.generateTokens).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
      roles: ['USER'],
    });
    expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      rawRefreshToken: 'refresh_123',
    });
    expect(result).toEqual({
      message: 'Đăng ký tài khoản thành công',
      user: createdUser.sanitize(),
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
    });
  });
});
