import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TokenService,
  AccessTokenPayload,
  AuthTokens,
} from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(payload: AccessTokenPayload): Promise<AuthTokens> {
    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'scoutboard_jwt_access_secret_key_2026_super_secure';
    const accessExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '15m';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'scoutboard_jwt_refresh_secret_key_2026_super_secure';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiresIn as unknown as JwtSignOptions['expiresIn'],
    };

    const refreshOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as unknown as JwtSignOptions['expiresIn'],
    };

    const accessToken = await this.jwtService.signAsync(payload, accessOptions);
    const refreshToken = await this.jwtService.signAsync(
      payload,
      refreshOptions,
    );

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<AccessTokenPayload> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'scoutboard_jwt_refresh_secret_key_2026_super_secure';

    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: refreshSecret,
    });
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
