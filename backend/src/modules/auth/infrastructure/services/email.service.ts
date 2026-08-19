import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      '"ScoutBoard Platform" <no-reply@scoutboard.com>',
    );

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`SMTP configured for host: ${host}:${port}`);
      } catch (err: any) {
        this.logger.warn(`Failed to initialize SMTP transporter: ${err.message}`);
      }
    } else {
      this.logger.log(
        'SMTP credentials not set. Running in DEV mode (OTP logged to console).',
      );
    }
  }

  async sendVerificationEmail(
    to: string,
    code: string,
    fullName?: string,
  ): Promise<boolean> {
    const subject = '⚽ ScoutBoard - Mã xác thực kích hoạt tài khoản của bạn';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #38bdf8; margin: 0;">⚽ ScoutBoard Platform</h2>
          <p style="color: #94a3b8; font-size: 14px;">Hệ thống phân tích & đánh giá cầu thủ bóng đá</p>
        </div>
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
          <p>Xin chào <strong>${fullName || to}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại ScoutBoard. Dưới đây là mã OTP để kích hoạt tài khoản của bạn:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8; background: #090d16; padding: 12px 28px; border-radius: 8px; border: 1px dashed #38bdf8;">
              ${code}
            </span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">Mã xác thực này có hiệu lực trong vòng <strong>15 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, html, code, 'VERIFICATION');
  }

  async sendPasswordResetEmail(
    to: string,
    code: string,
    fullName?: string,
  ): Promise<boolean> {
    const subject = '🛡️ ScoutBoard - Yêu cầu đặt lại mật khẩu';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #38bdf8; margin: 0;">⚽ ScoutBoard Platform</h2>
          <p style="color: #94a3b8; font-size: 14px;">Hệ thống bảo mật & quản lý danh tính</p>
        </div>
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
          <p>Xin chào <strong>${fullName || to}</strong>,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ScoutBoard của bạn. Dưới đây là mã OTP xác thực:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #fde047; background: #090d16; padding: 12px 28px; border-radius: 8px; border: 1px dashed #fde047;">
              ${code}
            </span>
          </div>
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">Mã xác thực này có hiệu lực trong vòng <strong>15 phút</strong>. Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, html, code, 'PASSWORD_RESET');
  }

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    otpCode: string,
    type: 'VERIFICATION' | 'PASSWORD_RESET',
  ): Promise<boolean> {
    const bannerTitle =
      type === 'VERIFICATION'
        ? '📧 [SCOUTBOARD EMAIL SERVICE] - EMAIL VERIFICATION OTP'
        : '🛡️ [SCOUTBOARD EMAIL SERVICE] - PASSWORD RESET OTP';

    this.logger.log(`
======================================================================
${bannerTitle}
To: ${to}
Subject: ${subject}
MÃ OTP: [ ${otpCode} ] (Hết hạn sau 15 phút)
======================================================================`);

    if (!this.transporter) {
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Error sending email to ${to}: ${err.message}`);
      return false;
    }
  }
}
