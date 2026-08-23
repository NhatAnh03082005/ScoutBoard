import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShortlistPlayerNoteDto {
  @ApiPropertyOptional({
    example: 'Strong 1v1 defender, high press resistance',
    description: 'Scout note for this player in the shortlist (pass null to clear)',
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note: string | null;
}
