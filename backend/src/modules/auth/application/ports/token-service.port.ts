export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenService {
  generateTokens(payload: AccessTokenPayload): Promise<AuthTokens>;
  verifyRefreshToken(token: string): Promise<AccessTokenPayload>;
  hashToken(token: string): string;
}
