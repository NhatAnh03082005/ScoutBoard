/* eslint-disable @typescript-eslint/unbound-method */
import { LogoutUseCase } from './logout.use-case';
import { TokenService } from '../ports/token-service.port';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { RefreshToken } from '../../domain/entities/refresh-token';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

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

    useCase = new LogoutUseCase(mockTokenService, mockRefreshTokenRepository);
  });

  it('should revoke active refresh token if found and save changes', async () => {
    const existingToken = new RefreshToken(
      'token-1',
      'user-1',
      'hash_123',
      null,
      new Date(Date.now() + 3600000),
    );

    mockTokenService.hashToken.mockReturnValue('hash_123');
    mockRefreshTokenRepository.findByHashAndUserId.mockResolvedValue(
      existingToken,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      refreshToken: 'raw_refresh_token',
    });

    expect(existingToken.isRevoked()).toBe(true);
    expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(existingToken);
    expect(result).toEqual({ message: 'Đăng xuất thành công' });
  });

  it('should return success message gracefully even if token not found in DB', async () => {
    mockTokenService.hashToken.mockReturnValue('hash_123');
    mockRefreshTokenRepository.findByHashAndUserId.mockResolvedValue(null);

    const result = await useCase.execute({
      userId: 'user-1',
      refreshToken: 'raw_refresh_token',
    });

    expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Đăng xuất thành công' });
  });
});
