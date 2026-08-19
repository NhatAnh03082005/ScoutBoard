import { Injectable, Inject } from '@nestjs/common';
import { CreateUserUseCase } from '../../../users/application/use-cases/create-user.use-case';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import {
  TOKEN_SERVICE,
  TokenService,
  AuthTokens,
} from '../ports/token-service.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../users/domain/repositories/user.repository';
import { User } from '../../../users/domain/entities/user';
import { EmailService } from '../../infrastructure/services/email.service';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface RegisterOutput extends AuthTokens {
  message: string;
  user: any;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const passwordHash = await this.passwordHasher.hash(input.password);

    const user: User = await this.createUserUseCase.execute({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    });

    // Tạo mã OTP xác thực email và gửi tới hòm thư người dùng
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    user.setEmailVerification(otp, expiresAt);
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(
      user.getEmail(),
      otp,
      user.getFullName(),
    );

    const payload = {
      sub: user.id,
      email: user.getEmail(),
      roles: user.getRoles().map((r) => r.code),
    };

    const tokens = await this.tokenService.generateTokens(payload);

    await this.refreshTokenRepository.create({
      userId: user.id,
      rawRefreshToken: tokens.refreshToken,
    });

    return {
      message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt.',
      user: user.sanitize(),
      ...tokens,
    };
  }
}
