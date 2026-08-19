import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/repositories/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  message: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này.');
    }

    const savedCode = user.getPasswordResetCode();
    const expiresAt = user.getPasswordResetExpiresAt();

    if (!savedCode || savedCode !== input.code.trim()) {
      throw new BadRequestException('Mã xác thực OTP đặt lại mật khẩu không chính xác.');
    }

    if (expiresAt && new Date() > expiresAt) {
      throw new BadRequestException(
        'Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu cấp lại mã mới.',
      );
    }

    if (!input.newPassword || input.newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);
    user.resetPassword(newPasswordHash);
    await this.userRepository.save(user);

    return {
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }
}
