import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/repositories/user.repository';
import { EmailService } from '../../infrastructure/services/email.service';

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordOutput {
  message: string;
}

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
    const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

    // Nếu user tồn tại, tạo OTP và gửi email
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

      user.setPasswordReset(otp, expiresAt);
      await this.userRepository.save(user);

      await this.emailService.sendPasswordResetEmail(
        user.getEmail(),
        otp,
        user.getFullName(),
      );
    }

    // Luôn trả về thông báo chung để tránh brute-force dò email (Email Enumeration protection)
    return {
      message:
        'Nếu email của bạn tồn tại trong hệ thống, mã OTP xác thực đặt lại mật khẩu đã được gửi tới hộp thư.',
    };
  }
}
