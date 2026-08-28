import { IsNotEmpty, IsOptional, IsString, IsEnum, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SquadVisibilityEnum {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum FormationCodeEnum {
  F_433 = '4-3-3',
  F_4231 = '4-2-3-1',
  F_442 = '4-4-2',
  F_352 = '3-5-2',
  F_343 = '3-4-3',
}

export class CreateSquadDto {
  @ApiProperty({
    example: 'Dream Team EPL 2026',
    description: 'Name of the squad',
  })
  @IsString({ message: 'Squad name must be a string' })
  @IsNotEmpty({ message: 'Squad name cannot be empty' })
  @MaxLength(150, { message: 'Squad name cannot exceed 150 characters' })
  name: string;

  @ApiProperty({
    enum: FormationCodeEnum,
    example: '4-3-3',
    description: 'Tactical formation code (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3)',
  })
  @IsEnum(FormationCodeEnum, {
    message: 'Formation code must be one of: 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3',
  })
  @IsNotEmpty({ message: 'Formation code cannot be empty' })
  formationCode: FormationCodeEnum;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Associated season ID (UUID or null for free squad)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Season ID must be a valid UUID' })
  seasonId?: string | null;

  @ApiPropertyOptional({
    example: 'Possession based team focused on high pressing',
    description: 'Detailed description or tactical notes of the squad',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    enum: SquadVisibilityEnum,
    default: SquadVisibilityEnum.PRIVATE,
    example: SquadVisibilityEnum.PRIVATE,
    description: 'Visibility of the squad',
  })
  @IsOptional()
  @IsEnum(SquadVisibilityEnum, {
    message: 'Visibility must be either PRIVATE or PUBLIC',
  })
  visibility?: SquadVisibilityEnum;
}
