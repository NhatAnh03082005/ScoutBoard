import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SquadPlayerRoleEnum {
  STARTER = 'STARTER',
  SUBSTITUTE = 'SUBSTITUTE',
}

export class AddPlayerToSquadDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Player ID to add to squad',
  })
  @IsUUID('4', { message: 'Player ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Player ID cannot be empty' })
  playerId: string;

  @ApiPropertyOptional({
    example: 'CB-1',
    description: 'Slot code in tactical layout (e.g. GK, CB-1, ST; null for substitutes)',
  })
  @IsOptional()
  @IsString({ message: 'Slot code must be a string' })
  slotCode?: string | null;

  @ApiProperty({
    enum: SquadPlayerRoleEnum,
    example: SquadPlayerRoleEnum.STARTER,
    description: 'Role in squad (STARTER or SUBSTITUTE)',
  })
  @IsEnum(SquadPlayerRoleEnum, {
    message: 'Role must be either STARTER or SUBSTITUTE',
  })
  @IsNotEmpty({ message: 'Role cannot be empty' })
  role: SquadPlayerRoleEnum;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this player is the team captain (STARTER only)',
  })
  @IsOptional()
  @IsBoolean({ message: 'isCaptain must be a boolean' })
  isCaptain?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order for substitute bench ordering',
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number | null;
}
