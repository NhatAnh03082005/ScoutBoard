import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyncScope } from '../../../domain/enums/sync-scope.enum';
import { SyncTarget } from '../../../domain/enums/sync-target.enum';
import { SyncMode } from '../../../domain/enums/sync-mode.enum';

export class TriggerAdminSyncDto {
  @ApiProperty({
    description: 'Target Competition Canonical UUID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4', { message: 'competitionId must be a valid UUID' })
  @IsNotEmpty()
  competitionId: string;

  @ApiProperty({
    description: 'Target Season Canonical UUID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID('4', { message: 'seasonId must be a valid UUID' })
  @IsNotEmpty()
  seasonId: string;

  @ApiPropertyOptional({
    description: 'Synchronization Scope',
    enum: SyncScope,
    default: SyncScope.SEASON,
    example: SyncScope.SEASON,
  })
  @IsOptional()
  @IsEnum(SyncScope, {
    message: 'scope must be a valid SyncScope enum (SEASON, DATE, MATCH)',
  })
  scope?: SyncScope;

  @ApiPropertyOptional({
    description: 'Synchronization Target',
    enum: SyncTarget,
    default: SyncTarget.FULL,
    example: SyncTarget.FULL,
  })
  @IsOptional()
  @IsEnum(SyncTarget, {
    message:
      'target must be a valid SyncTarget enum (MATCHES, PLAYER_MATCH_STATISTICS, SEASON_STATISTICS, FULL)',
  })
  target?: SyncTarget;

  @ApiPropertyOptional({
    description: 'Synchronization Mode',
    enum: SyncMode,
    default: SyncMode.REFRESH,
    example: SyncMode.REFRESH,
  })
  @IsOptional()
  @IsEnum(SyncMode, {
    message: 'mode must be a valid SyncMode enum (MISSING, REFRESH)',
  })
  mode?: SyncMode;

  @ApiPropertyOptional({
    description: 'Specific Date for DATE scope (YYYY-MM-DD)',
    example: '2026-08-22',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;

  @ApiPropertyOptional({
    description:
      'Specific Match/Fixture External or Canonical ID for MATCH scope',
    example: '18535518',
  })
  @IsOptional()
  @IsString()
  matchId?: string;
}
