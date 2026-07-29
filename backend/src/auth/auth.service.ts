import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
import {
  LOGIN_LOCKOUT_CONFIG,
  getLockDurationMinutes,
  formatRetryAfter,
} from './constants/auth-lockout.constants';

type LoginTransactionResult =
  | {
      success: true;
      data: any;
    }
  | {
      success: false;
      errorCode: string;
      message: string;
      remainingAttempts?: number;
      retryAfterSeconds?: number;
      lockedUntil?: Date;
      lockoutLevel?: number;
    };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
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
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Execute Progressive Login Lockout within a Database Transaction & Pessimistic Lock
    const result: LoginTransactionResult = await this.dataSource.transaction(
      async (manager) => {
        const userRepository = manager.getRepository(User);

        // Fetch user with pessimistic_write lock to prevent lost updates and race conditions
        const user = await userRepository
          .createQueryBuilder('user')
          .addSelect('user.passwordHash')
          .setLock('pessimistic_write')
          .where('LOWER(user.email) = LOWER(:email)', {
            email: normalizedEmail,
          })
          .getOne();

        if (!user) {
          return {
            success: false,
            errorCode: 'INVALID_CREDENTIALS',
            message: 'Email hoặc mật khẩu không chính xác.',
          };
        }

        if (user.status === 'DISABLED') {
          return {
            success: false,
            errorCode: 'ACCOUNT_DISABLED',
            message: 'Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên.',
          };
        }

        if (user.status === 'LOCKED') {
          return {
            success: false,
            errorCode: 'ACCOUNT_ADMIN_LOCKED',
            message: 'Tài khoản đã bị khóa bởi Quản trị viên.',
          };
        }

        const nowMs = Date.now();
        const observationWindowMs =
          LOGIN_LOCKOUT_CONFIG.observationWindowHours * 60 * 60 * 1000;

        // Reset progressive lockout data if last failed login was over 24 hours ago
        const windowExpired =
          user.lastFailedLoginAt !== null &&
          nowMs - new Date(user.lastFailedLoginAt).getTime() >=
            observationWindowMs;

        if (windowExpired) {
          await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "lockout_count" = 0,
                 "locked_until" = NULL,
                 "last_failed_login_at" = NULL
             WHERE "id" = $1`,
            [user.id],
          );
          user.failedLoginAttempts = 0;
          user.lockoutCount = 0;
          user.lockedUntil = null;
          user.lastFailedLoginAt = null;
        }

        // Check if account is currently temporarily locked
        const isTemporarilyLocked =
          user.lockedUntil !== null &&
          new Date(user.lockedUntil).getTime() > nowMs;

        if (isTemporarilyLocked) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(
              (new Date(user.lockedUntil!).getTime() - nowMs) / 1000,
            ),
          );

          return {
            success: false,
            errorCode: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${formatRetryAfter(
              retryAfterSeconds,
            )}.`,
            retryAfterSeconds,
            lockedUntil: user.lockedUntil!,
          };
        }

        // Clear expired temporary lock timestamp
        if (
          user.lockedUntil !== null &&
          new Date(user.lockedUntil).getTime() <= nowMs
        ) {
          await manager.query(
            `UPDATE "users" SET "locked_until" = NULL WHERE "id" = $1`,
            [user.id],
          );
          user.lockedUntil = null;
        }

        // Compare Password
        const passwordMatches = await bcrypt.compare(
          dto.password,
          user.passwordHash,
        );

        if (passwordMatches) {
          // Success: Reset all lockout counters
          await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "lockout_count" = 0,
                 "locked_until" = NULL,
                 "last_failed_login_at" = NULL
             WHERE "id" = $1`,
            [user.id],
          );

          // Retrieve user with roles for JWT token payload
          const fullUser = await userRepository.findOne({
            where: { id: user.id },
            relations: ['userRoles', 'userRoles.role'],
          });

          const activeUser = fullUser || user;
          const tokens = await this.generateTokens(activeUser);
          await this.saveRefreshTokenWithManager(
            manager,
            user.id,
            tokens.refreshToken,
          );

          return {
            success: true,
            data: {
              message: 'Đăng nhập thành công',
              user: this.sanitizeUser(activeUser),
              ...tokens,
            },
          };
        }

        // Failed Login: Perform atomic increment in PostgreSQL
        const incrementResult = await manager.query(
          `UPDATE "users"
           SET "failed_login_attempts" = COALESCE("failed_login_attempts", 0) + 1,
               "last_failed_login_at" = NOW()
           WHERE "id" = $1
           RETURNING "failed_login_attempts", "lockout_count", "last_failed_login_at"`,
          [user.id],
        );

        const row = this.extractReturnedRow(incrementResult);
        const rawAttempts = row?.failed_login_attempts ?? row?.failedloginattempts;
        const failedAttempts = parseInt(String(rawAttempts), 10) || 1;
        const maxAttempts = LOGIN_LOCKOUT_CONFIG.maxFailedAttempts;

        if (failedAttempts >= maxAttempts) {
          // Trigger Lockout Tier
          const lockoutResult = await manager.query(
            `UPDATE "users"
             SET "lockout_count" = COALESCE("lockout_count", 0) + 1
             WHERE "id" = $1
             RETURNING "lockout_count"`,
            [user.id],
          );

          const lRow = this.extractReturnedRow(lockoutResult);
          const rawLockCount = lRow?.lockout_count ?? lRow?.lockoutcount;
          const newLockoutCount = parseInt(String(rawLockCount), 10) || 1;

          // Tier 4+: Automatically DISABLE account after 3 temporary lockout periods (1m, 5m, 15m)
          if (newLockoutCount >= 4) {
            await manager.query(
              `UPDATE "users"
               SET "status" = 'DISABLED',
                   "failed_login_attempts" = 0,
                   "locked_until" = NULL
               WHERE "id" = $1`,
              [user.id],
            );

            return {
              success: false,
              errorCode: 'ACCOUNT_DISABLED',
              message:
                'Tài khoản của bạn đã bị VÔ HIỆU HÓA do tái phạm nhập sai mật khẩu quá nhiều lần (sau 3 đợt tạm khóa). Vui lòng liên hệ Quản trị viên để hỗ trợ.',
            };
          }

          const durationMinutes = getLockDurationMinutes(newLockoutCount);

          const lockedResult = await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "locked_until" = NOW() + ($2 * INTERVAL '1 minute')
             WHERE "id" = $1
             RETURNING "locked_until"`,
            [user.id, durationMinutes],
          );

          const lockedRow = this.extractReturnedRow(lockedResult);
          const lockedUntil = lockedRow?.locked_until ?? lockedRow?.lockeduntil;
          const retryAfterSeconds = durationMinutes * 60;

          return {
            success: false,
            errorCode: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: `Bạn đã nhập sai mật khẩu ${failedAttempts} lần liên tiếp (Đợt ${newLockoutCount}/3). Tài khoản bị tạm khóa trong ${durationMinutes} phút.`,
            retryAfterSeconds,
            lockedUntil,
            lockoutLevel: newLockoutCount,
          };
        }

        const remainingAttempts = Math.max(0, maxAttempts - failedAttempts);
        return {
          success: false,
          errorCode: 'INVALID_CREDENTIALS',
          message: `Mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi bị tạm khóa.`,
          remainingAttempts,
        };
      },
    );

    // Throw Exception AFTER Transaction Commit so lockout DB updates are persisted
    if (!result.success) {
      throw new UnauthorizedException({
        code: result.errorCode,
        message: result.message,
        remainingAttempts: result.remainingAttempts,
        retryAfterSeconds: result.retryAfterSeconds,
        lockedUntil: result.lockedUntil,
      });
    }

    return result.data;
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
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!existingToken || existingToken.revokedAt) {
      throw new UnauthorizedException(
        'Refresh token đã bị thu hồi hoặc không tồn tại',
      );
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

  private async saveRefreshTokenWithManager(
    manager: any,
    userId: string,
    rawRefreshToken: string,
    tokenFamilyId?: string,
  ) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const repo = manager.getRepository(RefreshToken);
    const refreshTokenEntity = repo.create({
      userId,
      tokenHash,
      tokenFamilyId: tokenFamilyId || null,
      expiresAt,
    });

    return repo.save(refreshTokenEntity);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private extractReturnedRow(result: any): any {
    if (!result) return null;
    let target = result;
    if (Array.isArray(target) && target.length > 0) {
      target = target[0];
    }
    if (Array.isArray(target) && target.length > 0) {
      target = target[0];
    }
    return target;
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...result } = user;
    return result;
  }
}
