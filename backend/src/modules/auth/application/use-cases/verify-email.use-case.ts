import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/repositories/user.repository';

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface VerifyEmailOutput {
  message: string;
  user: any;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutput> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này.');
    }

    if (user.getIsEmailVerified()) {
      return {
        message: 'Email này đã được xác thực trước đó.',
        user: user.sanitize(),
      };
    }

    const savedCode = user.getEmailVerificationCode();
    const expiresAt = user.getEmailVerificationExpiresAt();

    if (!savedCode || savedCode !== input.code.trim()) {
      throw new BadRequestException('Mã xác thực OTP không chính xác.');
    }

    if (expiresAt && new Date() > expiresAt) {
      throw new BadRequestException(
        'Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
      );
    }

    user.verifyEmail();
    await this.userRepository.save(user);

    return {
      message: 'Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.',
      user: user.sanitize(),
    };
  }
}
