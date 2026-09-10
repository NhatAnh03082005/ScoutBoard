import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShortlistVisibilityEnum {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export class CreateShortlistDto {
  @ApiProperty({
    example: 'European U21 Targets',
    description: 'Name of the shortlist',
  })
  @IsString({ message: 'Shortlist name must be a string' })
  @IsNotEmpty({ message: 'Shortlist name cannot be empty' })
  @MaxLength(150, { message: 'Shortlist name cannot exceed 150 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'Young players to monitor for summer transfer window',
    description: 'Detailed description of the shortlist',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    enum: ShortlistVisibilityEnum,
    default: ShortlistVisibilityEnum.PRIVATE,
    example: ShortlistVisibilityEnum.PRIVATE,
    description: 'Visibility of the shortlist',
  })
  @IsOptional()
  @IsEnum(ShortlistVisibilityEnum, {
    message: 'Visibility must be either PRIVATE or PUBLIC',
  })
  visibility?: ShortlistVisibilityEnum;
}
