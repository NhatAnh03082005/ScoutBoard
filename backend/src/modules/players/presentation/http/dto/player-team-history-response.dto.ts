import { ApiProperty } from '@nestjs/swagger';

export class TeamBasicResponseDto {
  @ApiProperty({ description: 'ID của đội bóng' })
  id: string;

  @ApiProperty({ description: 'Tên đội bóng' })
  name: string;

  @ApiProperty({ description: 'Tên ngắn đội bóng', nullable: true })
  shortName: string | null;

  @ApiProperty({ description: 'Logo URL', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ description: 'Quốc gia', nullable: true })
  country: string | null;
}

export class PlayerTeamHistoryResponseDto {
  @ApiProperty({ description: 'ID bản ghi lịch sử' })
  id: string;

  @ApiProperty({ description: 'Thông tin đội bóng', type: TeamBasicResponseDto })
  team: TeamBasicResponseDto;

  @ApiProperty({ description: 'Ngày gia nhập (YYYY-MM-DD)', nullable: true })
  joinedAt: string | null;

  @ApiProperty({ description: 'Ngày rời đội (YYYY-MM-DD)', nullable: true })
  leftAt: string | null;

  @ApiProperty({ description: 'Số áo', nullable: true })
  shirtNumber: number | null;

  @ApiProperty({ description: 'Có phải đội hiện tại không' })
  isCurrent: boolean;
}
