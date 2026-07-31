/* eslint-disable @typescript-eslint/unbound-method */
import { RefreshTokensUseCase } from './refresh-tokens.use-case';
import { TokenService } from '../ports/token-service.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { GetUserByIdUseCase } from '../../../users/application/use-cases/get-user-by-id.use-case';
import { RefreshToken } from '../../domain/entities/refresh-token';
import { User } from '../../../users/domain/entities/user';
import { Role } from '../../../users/domain/entities/role';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';

describe('RefreshTokensUseCase', () => {
  let useCase: RefreshTokensUseCase;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let mockGetUserByIdUseCase: jest.Mocked<GetUserByIdUseCase>;

  beforeEach(() => {
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

    mockGetUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUserByIdUseCase>;

    useCase = new RefreshTokensUseCase(
      mockTokenService,
      mockRefreshTokenRepository,
      mockGetUserByIdUseCase,
    );
  });

  it('should throw InvalidRefreshTokenError if token is invalid or expired', async () => {
    mockTokenService.verifyRefreshToken.mockRejectedValue(
      new Error('Invalid token'),
    );

    await expect(
      useCase.execute({ refreshToken: 'bad_token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('should throw InvalidRefreshTokenError if refresh token does not exist in DB or is revoked', async () => {
    mockTokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['USER'],
    });
    mockTokenService.hashToken.mockReturnValue('hash_123');
    mockRefreshTokenRepository.findByHashAndUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'valid_jwt_token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('should revoke existing token and issue new token pair successfully', async () => {
    const payload = {
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['USER'],
    };
    const roleUser = new Role('role-1', 'USER', 'User');
    const activeUser = new User(
      'user-1',
      'user@example.com',
      'hashed_pass',
      'Active User',
      'ACTIVE',
      0,
      0,
      null,
      null,
      [roleUser],
    );

    const existingToken = new RefreshToken(
      'token-1',
      'user-1',
      'hash_123',
      'family-1',
      new Date(Date.now() + 86400000), // valid for 1 day
    );

    mockTokenService.verifyRefreshToken.mockResolvedValue(payload);
    mockTokenService.hashToken.mockReturnValue('hash_123');
    mockRefreshTokenRepository.findByHashAndUserId.mockResolvedValue(
      existingToken,
    );
    mockGetUserByIdUseCase.execute.mockResolvedValue(activeUser);
    mockTokenService.generateTokens.mockResolvedValue({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    });

    const result = await useCase.execute({ refreshToken: 'valid_jwt_token' });

    expect(existingToken.isRevoked()).toBe(true);
    expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(existingToken);
    expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      rawRefreshToken: 'new_refresh_token',
      tokenFamilyId: 'family-1',
    });
    expect(result.accessToken).toBe('new_access_token');
    expect(result.refreshToken).toBe('new_refresh_token');
  });
});
