import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShortlistPlayer } from '../../../domain/entities/shortlist-player';

export class ShortlistPlayerResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  shortlistId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  playerId: string;

  @ApiPropertyOptional({ example: 'Strong 1v1 defender' })
  note: string | null;

  @ApiPropertyOptional()
  addedAt?: Date;

  static fromDomain(
    shortlistPlayer: ShortlistPlayer,
  ): ShortlistPlayerResponseDto {
    const dto = new ShortlistPlayerResponseDto();
    dto.id = shortlistPlayer.id;
    dto.shortlistId = shortlistPlayer.shortlistId;
    dto.playerId = shortlistPlayer.playerId;
    dto.note = shortlistPlayer.getNote();
    dto.addedAt = shortlistPlayer.addedAt;
    return dto;
  }
}
