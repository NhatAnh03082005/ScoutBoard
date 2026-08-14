import { ApiProperty } from '@nestjs/swagger';

export class SeasonBasicResponseDto {
  @ApiProperty({ description: 'ID mùa giải' })
  id: string;

  @ApiProperty({ description: 'Mã mùa giải (VD: 2025-2026)', nullable: true })
  seasonCode: string | null;

  @ApiProperty({ description: 'Có phải mùa hiện tại không' })
  isCurrent: boolean;
}

export class CompetitionBasicResponseDto {
  @ApiProperty({ description: 'ID giải đấu' })
  id: string;

  @ApiProperty({ description: 'Tên giải đấu' })
  name: string;

  @ApiProperty({ description: 'Quốc gia', nullable: true })
  country: string | null;
}

export class TeamBasicInfoDto {
  @ApiProperty({ description: 'ID đội bóng' })
  id: string;

  @ApiProperty({ description: 'Tên đội bóng' })
  name: string;

  @ApiProperty({ description: 'Tên viết tắt', nullable: true })
  shortName: string | null;

  @ApiProperty({ description: 'Logo URL', nullable: true })
  logoUrl: string | null;
}

export class PlayerSeasonStatisticResponseDto {
  @ApiProperty({ description: 'ID bản ghi thống kê mùa' })
  id: string;

  @ApiProperty({ description: 'Thông tin mùa giải', type: SeasonBasicResponseDto })
  season: SeasonBasicResponseDto;

  @ApiProperty({ description: 'Thông tin giải đấu', type: CompetitionBasicResponseDto })
  competition: CompetitionBasicResponseDto;

  @ApiProperty({ description: 'Thông tin đội bóng', type: TeamBasicInfoDto, nullable: true })
  team: TeamBasicInfoDto | null;

  @ApiProperty({ description: 'Số trận ra sân (Appearances)' })
  appearances: number;

  @ApiProperty({ description: 'Số trận đá chính' })
  starts: number;

  @ApiProperty({ description: 'Tổng số phút thi đấu' })
  minutesPlayed: number;

  @ApiProperty({ description: 'Số bàn thắng' })
  goals: number;

  @ApiProperty({ description: 'Số kiến tạo' })
  assists: number;

  @ApiProperty({ description: 'Số cú sút' })
  shots: number;

  @ApiProperty({ description: 'Số cú sút trúng đích' })
  shotsOnTarget: number;

  @ApiProperty({ description: 'Tổng số đường chuyền' })
  passes: number;

  @ApiProperty({ description: 'Tỷ lệ chuyền chính xác (%)', nullable: true })
  passAccuracy: number | null;

  @ApiProperty({ description: 'Số đường chuyền tạo cơ hội' })
  keyPasses: number;

  @ApiProperty({ description: 'Số lần tắc bóng' })
  tackles: number;

  @ApiProperty({ description: 'Số lần đánh chặn' })
  interceptions: number;

  @ApiProperty({ description: 'Số tranh chấp thắng' })
  duelsWon: number;

  // Per-90 Metrics
  @ApiProperty({ description: 'Số bàn thắng / 90 phút', nullable: true })
  goalsPer90: number | null;

  @ApiProperty({ description: 'Số kiến tạo / 90 phút', nullable: true })
  assistsPer90: number | null;

  @ApiProperty({ description: 'Số cú sút / 90 phút', nullable: true })
  shotsPer90: number | null;

  @ApiProperty({ description: 'Số cú sút trúng đích / 90 phút', nullable: true })
  shotsOnTargetPer90: number | null;

  @ApiProperty({ description: 'Số đường chuyền / 90 phút', nullable: true })
  passesPer90: number | null;

  @ApiProperty({ description: 'Key passes / 90 phút', nullable: true })
  keyPassesPer90: number | null;

  @ApiProperty({ description: 'Tắc bóng / 90 phút', nullable: true })
  tacklesPer90: number | null;

  @ApiProperty({ description: 'Đánh chặn / 90 phút', nullable: true })
  interceptionsPer90: number | null;

  @ApiProperty({ description: 'Tranh chấp thắng / 90 phút', nullable: true })
  duelsWonPer90: number | null;
}
