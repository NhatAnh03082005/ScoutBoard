import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePlayerPrimaryPositionDto {
  @ApiProperty({ example: 'DM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  positionCode: string;
}
