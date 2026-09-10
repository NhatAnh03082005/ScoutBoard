import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SquadPlayerRoleEnum } from './add-player-to-squad.dto';

export class UpdateSquadPlayerDto {
  @ApiPropertyOptional({
    example: 'CB-2',
    description: 'Updated slot code in tactical layout',
  })
  @IsOptional()
  @IsString({ message: 'Slot code must be a string' })
  slotCode?: string | null;

  @ApiPropertyOptional({
    enum: SquadPlayerRoleEnum,
    example: SquadPlayerRoleEnum.STARTER,
    description: 'Updated role in squad (STARTER or SUBSTITUTE)',
  })
  @IsOptional()
  @IsEnum(SquadPlayerRoleEnum, {
    message: 'Role must be either STARTER or SUBSTITUTE',
  })
  role?: SquadPlayerRoleEnum;

  @ApiPropertyOptional({
    example: true,
    description: 'Captain status',
  })
  @IsOptional()
  @IsBoolean({ message: 'isCaptain must be a boolean' })
  isCaptain?: boolean;

  @ApiPropertyOptional({
    example: 2,
    description: 'Display order for substitute bench ordering',
  })
  @IsOptional()
  @IsInt({ message: 'displayOrder must be an integer' })
  @Min(0, { message: 'displayOrder cannot be negative' })
  displayOrder?: number | null;
}
