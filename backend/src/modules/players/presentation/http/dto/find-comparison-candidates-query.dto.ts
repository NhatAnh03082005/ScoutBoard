import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PreferredFoot } from '../../../domain/enums/preferred-foot.enum';
import { ComparisonScope } from '../../../domain/enums/comparison-scope.enum';

export class FindComparisonCandidatesQueryDto {
  @ApiProperty({
    description: 'Phạm vi so sánh (COMPETITION: Giải đấu cụ thể, ALL: Tất cả giải đấu)',
    enum: ComparisonScope,
  })
  @IsNotEmpty({ message: 'scope không được để trống' })
  @IsEnum(ComparisonScope, {
    message: 'scope phải là COMPETITION hoặc ALL',
  })
  scope: ComparisonScope;

  @ApiProperty({ description: 'ID của mùa giải (UUID)' })
  @IsNotEmpty({ message: 'seasonId không được để trống' })
  @IsUUID('4', { message: 'seasonId phải là UUID hợp lệ' })
  seasonId: string;

  @ApiPropertyOptional({
    description: 'ID của giải đấu (UUID, bắt buộc khi scope=COMPETITION)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'competitionId phải là UUID hợp lệ' })
  competitionId?: string;

  @ApiPropertyOptional({ description: 'ID của đội bóng hiện tại (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'currentTeamId phải là UUID hợp lệ' })
  currentTeamId?: string;

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
  @IsEnum(PreferredFoot, {
    message: 'preferredFoot phải là LEFT, RIGHT hoặc BOTH',
  })
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

  @ApiPropertyOptional({
    description: 'Vị trí thi đấu (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, ST, CF, LW, RW)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  position?: string;

  @ApiPropertyOptional({ description: 'Tuổi tối thiểu (Min: 0, Max: 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minAge?: number;

  @ApiPropertyOptional({ description: 'Tuổi tối đa (Min: 0, Max: 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxAge?: number;

  @ApiPropertyOptional({
    description: 'Chiều cao tối thiểu tính bằng cm (Min: 120, Max: 230)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(120)
  @Max(230)
  minHeightCm?: number;

  @ApiPropertyOptional({
    description: 'Chiều cao tối đa tính bằng cm (Min: 120, Max: 230)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(120)
  @Max(230)
  maxHeightCm?: number;

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
