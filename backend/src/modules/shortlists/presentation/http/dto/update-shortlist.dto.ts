import { IsOptional, IsString, IsEnum, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShortlistVisibilityEnum } from './create-shortlist.dto';

export class UpdateShortlistDto {
  @ApiPropertyOptional({
    example: 'Updated Shortlist Name',
    description: 'New name for the shortlist',
  })
  @IsOptional()
  @IsString({ message: 'Shortlist name must be a string' })
  @IsNotEmpty({ message: 'Shortlist name cannot be empty' })
  @MaxLength(150, { message: 'Shortlist name cannot exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'New description for the shortlist',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    enum: ShortlistVisibilityEnum,
    example: ShortlistVisibilityEnum.PUBLIC,
    description: 'New visibility for the shortlist',
  })
  @IsOptional()
  @IsEnum(ShortlistVisibilityEnum, {
    message: 'Visibility must be either PRIVATE or PUBLIC',
  })
  visibility?: ShortlistVisibilityEnum;
}
