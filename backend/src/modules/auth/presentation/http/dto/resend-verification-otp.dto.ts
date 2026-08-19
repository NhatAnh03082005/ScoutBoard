import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email cần gửi lại mã xác thực OTP',
  })
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
