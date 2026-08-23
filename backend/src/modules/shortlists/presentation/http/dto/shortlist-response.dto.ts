import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Shortlist } from '../../../domain/entities/shortlist';

export class ShortlistResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  ownerId: string;

  @ApiProperty({ example: 'European U21 Targets' })
  name: string;

  @ApiPropertyOptional({ example: 'Young players to monitor' })
  description: string | null;

  @ApiProperty({ example: 'PRIVATE' })
  visibility: string;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  static fromDomain(shortlist: Shortlist): ShortlistResponseDto {
    const dto = new ShortlistResponseDto();
    dto.id = shortlist.id;
    dto.ownerId = shortlist.getOwnerId();
    dto.name = shortlist.getName();
    dto.description = shortlist.getDescription();
    dto.visibility = shortlist.getVisibility();
    dto.createdAt = shortlist.createdAt;
    dto.updatedAt = shortlist.updatedAt;
    return dto;
  }
}
