import { IsEnum, IsArray, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatusEnum, {
    message: 'Trạng thái phải là ACTIVE, DISABLED hoặc LOCKED',
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: UserStatusEnum;
}

export class UpdateUserRolesDto {
  @IsArray({ message: 'Danh sách vai trò phải là dạng mảng' })
  @IsString({ each: true, message: 'Mỗi vai trò phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Danh sách vai trò không được để trống' })
  roles: string[];
}

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
