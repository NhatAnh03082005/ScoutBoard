import { IsNotEmpty, IsOptional, IsString, IsEnum, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SquadVisibilityEnum, FormationCodeEnum } from './create-squad.dto';

export class UpdateSquadDto {
  @ApiPropertyOptional({
    example: 'Updated Dream Team 2026',
    description: 'Name of the squad',
  })
  @IsOptional()
  @IsString({ message: 'Squad name must be a string' })
  @IsNotEmpty({ message: 'Squad name cannot be empty' })
  @MaxLength(150, { message: 'Squad name cannot exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({
    enum: FormationCodeEnum,
    example: '4-2-3-1',
    description: 'Tactical formation code (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3)',
  })
  @IsOptional()
  @IsEnum(FormationCodeEnum, {
    message: 'Formation code must be one of: 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3',
  })
  formationCode?: FormationCodeEnum;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Associated season ID (UUID or null)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Season ID must be a valid UUID' })
  seasonId?: string | null;

  @ApiPropertyOptional({
    example: 'Updated tactical notes',
    description: 'Detailed description of the squad',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    enum: SquadVisibilityEnum,
    example: SquadVisibilityEnum.PUBLIC,
    description: 'Visibility of the squad',
  })
  @IsOptional()
  @IsEnum(SquadVisibilityEnum, {
    message: 'Visibility must be either PRIVATE or PUBLIC',
  })
  visibility?: SquadVisibilityEnum;
}
