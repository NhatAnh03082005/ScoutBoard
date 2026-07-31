import { Injectable, Inject } from '@nestjs/common';
import {
  TOKEN_SERVICE,
  TokenService,
  AuthTokens,
  AccessTokenPayload,
} from '../ports/token-service.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { GetUserByIdUseCase } from '../../../users/application/use-cases/get-user-by-id.use-case';
import { InvalidRefreshTokenError } from '../../domain/errors/auth.errors';

export interface RefreshTokensInput {
  refreshToken: string;
}

export interface RefreshTokensOutput extends AuthTokens {
  message: string;
}

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  async execute(input: RefreshTokensInput): Promise<RefreshTokensOutput> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new InvalidRefreshTokenError(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const tokenHash = this.tokenService.hashToken(input.refreshToken);
    const existingToken = await this.refreshTokenRepository.findByHashAndUserId(
      tokenHash,
      payload.sub,
    );

    if (!existingToken || existingToken.isRevoked()) {
      throw new InvalidRefreshTokenError(
        'Refresh token đã bị thu hồi hoặc không tồn tại',
      );
    }

    if (existingToken.isExpired()) {
      throw new InvalidRefreshTokenError('Refresh token đã hết hạn');
    }

    existingToken.revoke();
    await this.refreshTokenRepository.save(existingToken);

    const user = await this.getUserByIdUseCase.execute(payload.sub);
    if (!user || user.getStatus() !== 'ACTIVE') {
      throw new InvalidRefreshTokenError('Tài khoản không hợp lệ');
    }

    const userPayload = {
      sub: user.id,
      email: user.getEmail(),
      roles: user.getRoles().map((r) => r.code),
    };

    const newTokens = await this.tokenService.generateTokens(userPayload);
    await this.refreshTokenRepository.create({
      userId: user.id,
      rawRefreshToken: newTokens.refreshToken,
      tokenFamilyId: existingToken.tokenFamilyId || existingToken.id,
    });

    return {
      message: 'Làm mới token thành công',
      ...newTokens,
    };
  }
}
