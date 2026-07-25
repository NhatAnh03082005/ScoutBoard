import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Đăng ký tài khoản thành công',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Đăng nhập thành công',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'scoutboard_jwt_refresh_secret_key_2026_super_secure';

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!existingToken || existingToken.revokedAt) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi hoặc không tồn tại');
    }

    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    existingToken.revokedAt = new Date();
    existingToken.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(existingToken);

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    const newTokens = await this.generateTokens(user);
    await this.saveRefreshToken(
      user.id,
      newTokens.refreshToken,
      existingToken.tokenFamilyId || existingToken.id,
    );

    return {
      message: 'Làm mới token thành công',
      ...newTokens,
    };
  }

  async logout(userId: string, dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId },
    });

    if (existingToken) {
      existingToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(existingToken);
    }

    return { message: 'Đăng xuất thành công' };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.userRoles?.map((ur) => ur.role?.code) || [],
    };

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

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    rawRefreshToken: string,
    tokenFamilyId?: string,
  ) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      tokenFamilyId: tokenFamilyId || null,
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...result } = user;
    return result;
  }
}
