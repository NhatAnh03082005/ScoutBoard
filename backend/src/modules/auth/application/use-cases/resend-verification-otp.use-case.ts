import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/repositories/user.repository';
import { EmailService } from '../../infrastructure/services/email.service';

export interface ResendVerificationOtpInput {
  email: string;
}

export interface ResendVerificationOtpOutput {
  message: string;
}

@Injectable()
export class ResendVerificationOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(
    input: ResendVerificationOtpInput,
  ): Promise<ResendVerificationOtpOutput> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này.');
    }

    if (user.getIsEmailVerified()) {
      return {
        message: 'Email này đã được xác thực trước đó.',
      };
    }

    // Tạo mã OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    user.setEmailVerification(otp, expiresAt);
    await this.userRepository.save(user);

    await this.emailService.sendVerificationEmail(
      user.getEmail(),
      otp,
      user.getFullName(),
    );

    return {
      message: 'Mã xác thực OTP mới đã được gửi tới email của bạn.',
    };
  }
}
