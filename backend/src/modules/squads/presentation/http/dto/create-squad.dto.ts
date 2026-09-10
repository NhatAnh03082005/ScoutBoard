import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SquadVisibilityEnum {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum FormationCodeEnum {
  F_433_ATTACK = '4-3-3 Attack',
  F_433 = '4-3-3',
  F_451 = '4-5-1',
  F_41212_WIDE = '4-1-2-1-2 Wide',
  F_424 = '4-2-4',
  F_433_DEFEND = '4-3-3 Defend',
  F_433_FALSE9 = '4-3-3 False 9',
  F_4231_NARROW = '4-2-3-1 Narrow',
  F_451_FLAT = '4-5-1 Flat',
  F_433_HOLDING = '4-3-3 Holding',
  F_4222 = '4-2-2-2',
  F_4231_WIDE = '4-2-3-1 Wide',
  F_4312 = '4-3-1-2',
  F_41212_NARROW = '4-1-2-1-2 Narrow',
  F_5221 = '5-2-2-1',
  F_5212 = '5-2-1-2',
  F_4141 = '4-1-4-1',
  F_532 = '5-3-2',
  F_442_FLAT = '4-4-2 Flat',
  F_343_FLAT = '3-4-3 Flat',
  F_343_DIAMOND = '3-4-3 Diamond',
  F_442_HOLDING = '4-4-2 Holding',
  F_4411_ATTACK = '4-4-1-1 Attack',
  F_4411_FLAT = '4-4-1-1 Flat',
  F_3412 = '3-4-1-2',
  F_541_HOLDING = '5-4-1 Holding',
  F_541_DEFEND = '5-4-1 Defend',
  F_3511 = '3-5-1-1',
  F_352 = '3-5-2',
  F_4321 = '4-3-2-1',
  F_3421 = '3-4-2-1',
  F_4213 = '4-2-1-3',
  F_4132 = '4-1-3-2',
  F_3142 = '3-1-4-2',
  // Backward compatibility aliases
  F_442 = '4-4-2',
  F_4231 = '4-2-3-1',
  F_343 = '3-4-3',
  F_433_FLAT = '4-3-3 Flat',
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
    description:
      'Tactical formation code (from 34 supported tactical formations)',
  })
  @IsEnum(FormationCodeEnum, {
    message:
      'Formation code must be one of the supported 34 tactical formations',
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
