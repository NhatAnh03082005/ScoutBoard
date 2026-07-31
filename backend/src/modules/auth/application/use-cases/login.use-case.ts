import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import {
  TOKEN_SERVICE,
  TokenService,
  AuthTokens,
} from '../ports/token-service.port';
import { UserOrmEntity } from '../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { RefreshTokenOrmEntity } from '../../infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';
import { UserMapper } from '../../../users/infrastructure/persistence/typeorm/mappers/user.mapper';
import {
  LOGIN_LOCKOUT_CONFIG,
  getLockDurationMinutes,
  formatRetryAfter,
} from '../../domain/constants/auth-lockout.constants';
import {
  InvalidCredentialsError,
  AccountDisabledError,
  AccountLockedError,
  AccountTemporarilyLockedError,
  AccountHasNoRolesError,
} from '../../domain/errors/auth.errors';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput extends AuthTokens {
  message: string;
  user: Record<string, unknown>;
}

type LoginTxResult =
  | {
      success: true;
      data: LoginOutput;
    }
  | {
      success: false;
      errorType: 'INVALID_CREDENTIALS';
      message: string;
      remainingAttempts?: number;
    }
  | {
      success: false;
      errorType: 'ACCOUNT_DISABLED';
      message: string;
    }
  | {
      success: false;
      errorType: 'ACCOUNT_ADMIN_LOCKED';
      message: string;
    }
  | {
      success: false;
      errorType: 'ACCOUNT_TEMPORARILY_LOCKED';
      message: string;
      retryAfterSeconds: number;
      lockedUntil: Date;
    }
  | {
      success: false;
      errorType: 'ACCOUNT_HAS_NO_ROLES';
      message: string;
    };

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const result: LoginTxResult = await this.dataSource.transaction(
      async (manager) => {
        const userRepository = manager.getRepository(UserOrmEntity);

        const userEntity = await userRepository
          .createQueryBuilder('user')
          .addSelect('user.passwordHash')
          .setLock('pessimistic_write')
          .where('LOWER(user.email) = LOWER(:email)', {
            email: normalizedEmail,
          })
          .getOne();

        if (!userEntity) {
          return {
            success: false,
            errorType: 'INVALID_CREDENTIALS',
            message: 'Email hoặc mật khẩu không chính xác.',
          };
        }

        if (userEntity.status === 'DISABLED') {
          return {
            success: false,
            errorType: 'ACCOUNT_DISABLED',
            message: 'Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên.',
          };
        }

        if (userEntity.status === 'LOCKED') {
          return {
            success: false,
            errorType: 'ACCOUNT_ADMIN_LOCKED',
            message: 'Tài khoản đã bị khóa bởi Quản trị viên.',
          };
        }

        const nowMs = Date.now();
        const observationWindowMs =
          LOGIN_LOCKOUT_CONFIG.observationWindowHours * 60 * 60 * 1000;

        const windowExpired =
          userEntity.lastFailedLoginAt !== null &&
          nowMs - new Date(userEntity.lastFailedLoginAt).getTime() >=
            observationWindowMs;

        if (windowExpired) {
          await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "lockout_count" = 0,
                 "locked_until" = NULL,
                 "last_failed_login_at" = NULL
             WHERE "id" = $1`,
            [userEntity.id],
          );
          userEntity.failedLoginAttempts = 0;
          userEntity.lockoutCount = 0;
          userEntity.lockedUntil = null;
          userEntity.lastFailedLoginAt = null;
        }

        const isTemporarilyLocked =
          userEntity.lockedUntil !== null &&
          new Date(userEntity.lockedUntil).getTime() > nowMs;

        if (isTemporarilyLocked) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(
              (new Date(userEntity.lockedUntil!).getTime() - nowMs) / 1000,
            ),
          );

          return {
            success: false,
            errorType: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${formatRetryAfter(
              retryAfterSeconds,
            )}.`,
            retryAfterSeconds,
            lockedUntil: userEntity.lockedUntil!,
          };
        }

        if (
          userEntity.lockedUntil !== null &&
          new Date(userEntity.lockedUntil).getTime() <= nowMs
        ) {
          await manager.query(
            `UPDATE "users" SET "locked_until" = NULL WHERE "id" = $1`,
            [userEntity.id],
          );
          userEntity.lockedUntil = null;
        }

        const passwordMatches = await this.passwordHasher.compare(
          input.password,
          userEntity.passwordHash,
        );

        if (passwordMatches) {
          await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "lockout_count" = 0,
                 "locked_until" = NULL,
                 "last_failed_login_at" = NULL
             WHERE "id" = $1`,
            [userEntity.id],
          );

          const fullUserEntity = await userRepository.findOne({
            where: { id: userEntity.id },
            relations: ['userRoles', 'userRoles.role'],
          });

          const activeUserEntity = fullUserEntity || userEntity;
          const userDomain = UserMapper.toDomain(activeUserEntity);
          const roles = userDomain.getRoles().map((r) => r.code);

          // Enforce business rule: Account must have at least one role to log in
          if (roles.length === 0) {
            return {
              success: false,
              errorType: 'ACCOUNT_HAS_NO_ROLES',
              message: 'Tài khoản chưa được phân quyền trong hệ thống.',
            };
          }

          const payload = {
            sub: userDomain.id,
            email: userDomain.getEmail(),
            roles,
          };

          const tokens = await this.tokenService.generateTokens(payload);
          const tokenHash = this.tokenService.hashToken(tokens.refreshToken);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const tokenRepo = manager.getRepository(RefreshTokenOrmEntity);
          const refreshTokenEntity = tokenRepo.create({
            userId: userDomain.id,
            tokenHash,
            tokenFamilyId: null,
            expiresAt,
          });
          await tokenRepo.save(refreshTokenEntity);

          return {
            success: true,
            data: {
              message: 'Đăng nhập thành công',
              user: {
                ...userDomain.sanitize(),
                roles,
              },
              ...tokens,
            },
          };
        }

        // Failed Login atomic update
        const incrementResult: unknown = await manager.query(
          `UPDATE "users"
           SET "failed_login_attempts" = COALESCE("failed_login_attempts", 0) + 1,
               "last_failed_login_at" = NOW()
           WHERE "id" = $1
           RETURNING "failed_login_attempts", "lockout_count", "last_failed_login_at"`,
          [userEntity.id],
        );

        const row = this.extractReturnedRow(incrementResult);
        const rawAttempts =
          row?.failed_login_attempts ?? row?.failedloginattempts;
        const failedAttempts =
          typeof rawAttempts === 'number'
            ? rawAttempts
            : typeof rawAttempts === 'string'
              ? parseInt(rawAttempts, 10)
              : 1;
        const maxAttempts = LOGIN_LOCKOUT_CONFIG.maxFailedAttempts;

        if (failedAttempts >= maxAttempts) {
          const lockoutResult: unknown = await manager.query(
            `UPDATE "users"
             SET "lockout_count" = COALESCE("lockout_count", 0) + 1
             WHERE "id" = $1
             RETURNING "lockout_count"`,
            [userEntity.id],
          );

          const lRow = this.extractReturnedRow(lockoutResult);
          const rawLockCount = lRow?.lockout_count ?? lRow?.lockoutcount;
          const newLockoutCount =
            typeof rawLockCount === 'number'
              ? rawLockCount
              : typeof rawLockCount === 'string'
                ? parseInt(rawLockCount, 10)
                : 1;

          if (newLockoutCount >= 4) {
            await manager.query(
              `UPDATE "users"
               SET "status" = 'DISABLED',
                   "failed_login_attempts" = 0,
                   "locked_until" = NULL
               WHERE "id" = $1`,
              [userEntity.id],
            );

            return {
              success: false,
              errorType: 'ACCOUNT_DISABLED',
              message:
                'Tài khoản của bạn đã bị VÔ HIỆU HÓA do tái phạm nhập sai mật khẩu quá nhiều lần (sau 3 đợt tạm khóa). Vui lòng liên hệ Quản trị viên để hỗ trợ.',
            };
          }

          const durationMinutes = getLockDurationMinutes(newLockoutCount);

          const lockedResult: unknown = await manager.query(
            `UPDATE "users"
             SET "failed_login_attempts" = 0,
                 "locked_until" = NOW() + ($2 * INTERVAL '1 minute')
             WHERE "id" = $1
             RETURNING "locked_until"`,
            [userEntity.id, durationMinutes],
          );

          const lockedRow = this.extractReturnedRow(lockedResult);
          const rawLockedUntil =
            lockedRow?.locked_until ?? lockedRow?.lockeduntil;
          const lockedUntil =
            rawLockedUntil instanceof Date
              ? rawLockedUntil
              : typeof rawLockedUntil === 'string'
                ? new Date(rawLockedLockedDateString(rawLockedUntil))
                : new Date();

          const retryAfterSeconds = durationMinutes * 60;

          return {
            success: false,
            errorType: 'ACCOUNT_TEMPORARILY_LOCKED',
            message: `Bạn đã nhập sai mật khẩu ${failedAttempts} lần liên tiếp (Đợt ${newLockoutCount}/3). Tài khoản bị tạm khóa trong ${durationMinutes} phút.`,
            retryAfterSeconds,
            lockedUntil,
          };
        }

        const remainingAttempts = Math.max(0, maxAttempts - failedAttempts);
        return {
          success: false,
          errorType: 'INVALID_CREDENTIALS',
          message: `Mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi bị tạm khóa.`,
          remainingAttempts,
        };
      },
    );

    if (!result.success) {
      if (result.errorType === 'ACCOUNT_DISABLED') {
        throw new AccountDisabledError(result.message);
      }
      if (result.errorType === 'ACCOUNT_ADMIN_LOCKED') {
        throw new AccountLockedError(result.message);
      }
      if (result.errorType === 'ACCOUNT_TEMPORARILY_LOCKED') {
        throw new AccountTemporarilyLockedError(
          result.message,
          result.retryAfterSeconds,
          result.lockedUntil,
        );
      }
      if (result.errorType === 'ACCOUNT_HAS_NO_ROLES') {
        throw new AccountHasNoRolesError(result.message);
      }
      throw new InvalidCredentialsError(result.message);
    }

    return result.data;
  }

  private extractReturnedRow(result: unknown): Record<string, unknown> | null {
    if (!result) return null;
    let target: unknown = result;
    if (Array.isArray(target) && target.length > 0) {
      target = (target as unknown[])[0];
    }
    if (Array.isArray(target) && target.length > 0) {
      target = (target as unknown[])[0];
    }
    if (typeof target === 'object' && target !== null) {
      return target as Record<string, unknown>;
    }
    return null;
  }
}

function rawLockedLockedDateString(val: string): string {
  return val;
}
