import { RefreshToken } from '../entities/refresh-token';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface RefreshTokenRepository {
  findByHashAndUserId(
    tokenHash: string,
    userId: string,
  ): Promise<RefreshToken | null>;

  findByHash(tokenHash: string): Promise<RefreshToken | null>;

  save(refreshToken: RefreshToken): Promise<RefreshToken>;

  create(data: {
    userId: string;
    rawRefreshToken: string;
    tokenFamilyId?: string;
  }): Promise<RefreshToken>;
}
