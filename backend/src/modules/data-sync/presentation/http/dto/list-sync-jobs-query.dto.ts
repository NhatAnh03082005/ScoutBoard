import { IsOptional, IsInt, Min, Max, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SyncJobStatus } from '../../../domain/enums/sync-job-status.enum';

export class ListSyncJobsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of jobs to return (pagination limit)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Number of jobs to skip (pagination offset)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({
    description: 'Filter jobs by status',
    enum: SyncJobStatus,
  })
  @IsOptional()
  @IsEnum(SyncJobStatus)
  status?: SyncJobStatus;

  @ApiPropertyOptional({
    description: 'Filter jobs by competition UUID',
  })
  @IsOptional()
  @IsUUID('4')
  competitionId?: string;

  @ApiPropertyOptional({
    description: 'Filter jobs by season UUID',
  })
  @IsOptional()
  @IsUUID('4')
  seasonId?: string;
}
