import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationOtpDto } from '../dto/resend-verification-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterUseCase } from '../../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { RefreshTokensUseCase } from '../../../application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from '../../../application/use-cases/verify-email.use-case';
import { ResendVerificationOtpUseCase } from '../../../application/use-cases/resend-verification-otp.use-case';
import { ForgotPasswordUseCase } from '../../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../../application/use-cases/reset-password.use-case';
import { UserEmailConflictError } from '../../../../users/domain/errors/users.errors';
import {
  InvalidCredentialsError,
  AccountDisabledError,
  AccountLockedError,
  AccountTemporarilyLockedError,
  InvalidRefreshTokenError,
  AccountHasNoRolesError,
} from '../../../domain/errors/auth.errors';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

interface RequestWithAuthUser {
  user: AuthenticatedUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationOtpUseCase: ResendVerificationOtpUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.registerUseCase.execute(dto);
    } catch (err) {
      if (err instanceof UserEmailConflictError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }

  @ApiOperation({ summary: 'Xác thực tài khoản bằng mã OTP gửi qua Email' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return await this.verifyEmailUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Gửi lại mã OTP xác thực email' })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification-otp')
  async resendVerificationOtp(@Body() dto: ResendVerificationOtpDto) {
    return await this.resendVerificationOtpUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Yêu cầu mã OTP đặt lại mật khẩu' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.forgotPasswordUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng mã OTP' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.resetPasswordUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto);
    } catch (err) {
      if (err instanceof AccountDisabledError) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_DISABLED',
          message: err.message,
        });
      }
      if (err instanceof AccountLockedError) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_ADMIN_LOCKED',
          message: err.message,
        });
      }
      if (err instanceof AccountTemporarilyLockedError) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_TEMPORARILY_LOCKED',
          message: err.messageText,
          retryAfterSeconds: err.retryAfterSeconds,
          lockedUntil: err.lockedUntil,
        });
      }
      if (err instanceof AccountHasNoRolesError) {
        throw new ForbiddenException({
          code: 'ACCOUNT_HAS_NO_ROLES',
          message: err.message,
        });
      }
      if (err instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: err.message,
        });
      }
      throw err;
    }
  }

  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      return await this.refreshTokensUseCase.execute(dto);
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException(err.message);
      }
      throw err;
    }
  }

  @ApiOperation({ summary: 'Đăng xuất và thu hồi Refresh Token' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Request() req: RequestWithAuthUser,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.logoutUseCase.execute({
      userId: req.user.id,
      refreshToken: dto.refreshToken,
    });
  }

  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại (Protected)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: RequestWithAuthUser) {
    return req.user;
  }
}
