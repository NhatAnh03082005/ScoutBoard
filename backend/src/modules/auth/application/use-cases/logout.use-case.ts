import { Injectable, Inject } from '@nestjs/common';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';

export interface LogoutInput {
  userId: string;
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: LogoutInput): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashToken(input.refreshToken);
    const existingToken = await this.refreshTokenRepository.findByHashAndUserId(
      tokenHash,
      input.userId,
    );

    if (existingToken) {
      existingToken.revoke();
      await this.refreshTokenRepository.save(existingToken);
    }

    return { message: 'Đăng xuất thành công' };
  }
}
