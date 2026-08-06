import { ApiProperty } from '@nestjs/swagger';

export class CompetitionTeamResponseDto {
  @ApiProperty({ description: 'ID của đội bóng (UUID)' })
  id: string;

  @ApiProperty({ description: 'Tên đầy đủ của đội bóng' })
  name: string;

  @ApiProperty({ description: 'Tên viết tắt của đội bóng', nullable: true })
  shortName: string | null;

  @ApiProperty({ description: 'Quốc gia', nullable: true })
  country: string | null;

  @ApiProperty({ description: 'URL logo của đội bóng', nullable: true })
  logoUrl: string | null;
}
