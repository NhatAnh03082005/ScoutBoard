import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SquadPlayer } from '../../../domain/entities/squad-player';

export class SquadPlayerResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  squadId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  playerId: string;

  @ApiPropertyOptional({ example: 'CB-1' })
  slotCode: string | null;

  @ApiProperty({ example: 'STARTER' })
  role: string;

  @ApiProperty({ example: false })
  isCaptain: boolean;

  @ApiPropertyOptional({ example: 1 })
  displayOrder: number | null;

  @ApiPropertyOptional()
  addedAt?: Date;

  static fromDomain(squadPlayer: SquadPlayer): SquadPlayerResponseDto {
    const dto = new SquadPlayerResponseDto();
    dto.id = squadPlayer.id;
    dto.squadId = squadPlayer.squadId;
    dto.playerId = squadPlayer.playerId;
    dto.slotCode = squadPlayer.getSlotCode();
    dto.role = String(squadPlayer.getRole());
    dto.isCaptain = squadPlayer.getIsCaptain();
    dto.displayOrder = squadPlayer.getDisplayOrder();
    dto.addedAt = squadPlayer.addedAt;
    return dto;
  }
}
