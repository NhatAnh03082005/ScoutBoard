import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @Transform(({ value }: TransformFnParams) => {
    const input = value as unknown;
    return typeof input === 'string' ? input.trim() : input;
  })
  @IsString({ message: 'Display name must be text.' })
  @IsNotEmpty({ message: 'Display name is required.' })
  @MinLength(2, { message: 'Display name must contain at least 2 characters.' })
  @MaxLength(150, { message: 'Display name cannot exceed 150 characters.' })
  fullName: string;
}

export class ChangeMyPasswordDto {
  @IsString({ message: 'Current password must be text.' })
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword: string;

  @IsString({ message: 'New password must be text.' })
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(8, { message: 'New password must contain at least 8 characters.' })
  @MaxLength(128, { message: 'New password cannot exceed 128 characters.' })
  newPassword: string;
}
