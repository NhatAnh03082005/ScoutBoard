import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FindPlayerMatchStatisticsQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID mùa giải' })
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID giải đấu' })
  @IsOptional()
  @IsUUID()
  competitionId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID đội bóng cầu thủ đại diện trong trận' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Số bản ghi tối đa (Mặc định: 10)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu (Mặc định: 0)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
