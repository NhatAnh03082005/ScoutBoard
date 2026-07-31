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
import { User } from '../../../users/domain/entities/user';

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
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const passwordHash = await this.passwordHasher.hash(input.password);

    const user: User = await this.createUserUseCase.execute({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    });

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
      message: 'Đăng ký tài khoản thành công',
      user: user.sanitize(),
      ...tokens,
    };
  }
}
