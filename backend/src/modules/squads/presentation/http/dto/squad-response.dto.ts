import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Squad } from '../../../domain/entities/squad';

export class SquadResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  ownerId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  seasonId: string | null;

  @ApiProperty({ example: 'Dream Team EPL 2026' })
  name: string;

  @ApiProperty({ example: '4-3-3' })
  formationCode: string;

  @ApiPropertyOptional({ example: 'Possession based team' })
  description: string | null;

  @ApiProperty({ example: 'PRIVATE' })
  visibility: string;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  static fromDomain(squad: Squad): SquadResponseDto {
    const dto = new SquadResponseDto();
    dto.id = squad.id;
    dto.ownerId = squad.getOwnerId();
    dto.seasonId = squad.getSeasonId();
    dto.name = squad.getName();
    dto.formationCode = String(squad.getFormationCode());
    dto.description = squad.getDescription();
    dto.visibility = squad.getVisibility();
    dto.createdAt = squad.createdAt;
    dto.updatedAt = squad.updatedAt;
    return dto;
  }
}
