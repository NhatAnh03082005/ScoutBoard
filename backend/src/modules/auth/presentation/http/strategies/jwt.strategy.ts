import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { GetUserByIdUseCase } from '../../../../users/application/use-cases/get-user-by-id.use-case';
import { Role } from '../../../../users/domain/entities/role';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  roles: string[];
  userRoles: { role: { code: string; name: string } }[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        secret || 'scoutboard_jwt_access_secret_key_2026_super_secure',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    roles: string[];
  }): Promise<AuthenticatedUser> {
    const user = await this.getUserByIdUseCase.execute(payload.sub);

    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản từ token không tồn tại trong hệ thống',
      );
    }

    if (user.getStatus() !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị vô hiệu hóa hoặc bị khóa',
      );
    }

    const roles = user.getRoles().map((r: Role) => r.code);

    return {
      id: user.id,
      email: user.getEmail(),
      fullName: user.getFullName(),
      avatarUrl: user.getAvatarUrl(),
      status: user.getStatus(),
      roles,
      // Backward-compatible helper for legacy components
      userRoles: roles.map((code) => ({ role: { code, name: code } })),
    };
  }
}
