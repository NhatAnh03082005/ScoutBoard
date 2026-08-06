import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { PreferredFoot } from '../../../domain/enums/preferred-foot.enum';

export class SearchPlayersQueryDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên cầu thủ' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Chân thuận của cầu thủ (LEFT, RIGHT, BOTH)',
    enum: PreferredFoot,
  })
  @IsOptional()
  @IsEnum(PreferredFoot)
  preferredFoot?: PreferredFoot;

  @ApiPropertyOptional({
    description: 'Quốc tịch của cầu thủ (ví dụ: Brazil, England)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  nationality?: string;

  @ApiPropertyOptional({ description: 'ID của đội bóng (Dành cho client cũ)' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Vị trí thi đấu (Dành cho client cũ)' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi tối đa (Default: 20, Min: 1, Max: 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi bỏ qua (Default: 0, Min: 0)',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
