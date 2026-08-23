import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPlayerToShortlistDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the player to add to the shortlist',
  })
  @IsUUID('4', { message: 'Player ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Player ID cannot be empty' })
  playerId: string;

  @ApiPropertyOptional({
    example: 'Scouted during Champions League match, excellent agility',
    description: 'Optional initial scouting note for this player in the shortlist',
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;
}
