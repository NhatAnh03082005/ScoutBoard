import { ApiProperty } from '@nestjs/swagger';

export class MatchCompetitionSummaryDto {
  @ApiProperty({ description: 'ID giải đấu' })
  id: string;

  @ApiProperty({ description: 'Tên giải đấu' })
  name: string;

  @ApiProperty({ description: 'Quốc gia', nullable: true })
  country: string | null;
}

export class MatchSeasonSummaryDto {
  @ApiProperty({ description: 'ID mùa giải' })
  id: string;

  @ApiProperty({ description: 'Mã mùa giải (VD: 2025-2026)', nullable: true })
  seasonCode: string | null;
}

export class MatchTeamSummaryDto {
  @ApiProperty({ description: 'ID đội bóng' })
  id: string;

  @ApiProperty({ description: 'Tên đội bóng' })
  name: string;

  @ApiProperty({ description: 'Tên viết tắt', nullable: true })
  shortName: string | null;

  @ApiProperty({ description: 'Logo URL', nullable: true })
  logoUrl: string | null;
}

export class MatchBasicResponseDto {
  @ApiProperty({ description: 'ID trận đấu' })
  id: string;

  @ApiProperty({ description: 'Thời gian diễn ra (Kickoff date)', nullable: true })
  kickoffAt: string | null;

  @ApiProperty({ description: 'Trạng thái trận đấu' })
  status: string;

  @ApiProperty({ description: 'Thông tin giải đấu', type: MatchCompetitionSummaryDto })
  competition: MatchCompetitionSummaryDto;

  @ApiProperty({ description: 'Thông tin mùa giải', type: MatchSeasonSummaryDto })
  season: MatchSeasonSummaryDto;

  @ApiProperty({ description: 'Đội nhà', type: MatchTeamSummaryDto })
  homeTeam: MatchTeamSummaryDto;

  @ApiProperty({ description: 'Đội khách', type: MatchTeamSummaryDto })
  awayTeam: MatchTeamSummaryDto;

  @ApiProperty({ description: 'Tỷ số đội nhà', nullable: true })
  homeScore: number | null;

  @ApiProperty({ description: 'Tỷ số đội khách', nullable: true })
  awayScore: number | null;
}

export class PlayerMatchStatisticItemDto {
  @ApiProperty({ description: 'ID bản ghi thống kê trận đấu' })
  id: string;

  @ApiProperty({ description: 'Thông tin trận đấu và bối cảnh', type: MatchBasicResponseDto })
  match: MatchBasicResponseDto;

  @ApiProperty({ description: 'Đội bóng cầu thủ đại diện trong trận', type: MatchTeamSummaryDto })
  team: MatchTeamSummaryDto;

  @ApiProperty({ description: 'Số phút thi đấu' })
  minutesPlayed: number;

  @ApiProperty({ description: 'Có đá chính không' })
  isStarter: boolean;

  @ApiProperty({ description: 'Điểm số đánh giá (Rating)', nullable: true })
  rating: number | null;

  @ApiProperty({ description: 'Số bàn thắng' })
  goals: number;

  @ApiProperty({ description: 'Số kiến tạo' })
  assists: number;

  @ApiProperty({ description: 'Số cú sút' })
  shots: number;

  @ApiProperty({ description: 'Số đường chuyền tạo cơ hội' })
  keyPasses: number;

  @ApiProperty({ description: 'Số đường chuyền thực hiện (Attempts)' })
  passesAttempted: number;

  @ApiProperty({ description: 'Số đường chuyền thành công (Completed)' })
  passesCompleted: number;

  @ApiProperty({ description: 'Tỷ lệ chuyền chính xác (%)', nullable: true })
  passAccuracy: number | null;

  @ApiProperty({ description: 'Số lần tắc bóng' })
  tackles: number;

  @ApiProperty({ description: 'Số lần đánh chặn' })
  interceptions: number;

  @ApiProperty({ description: 'Số thẻ vàng' })
  yellowCards: number;

  @ApiProperty({ description: 'Số thẻ đỏ' })
  redCards: number;

  @ApiProperty({ description: 'Thống kê JSONB nâng cao', nullable: true })
  statistics: Record<string, any> | null;
}

export class PlayerMatchStatisticListResponseDto {
  @ApiProperty({ description: 'Danh sách thống kê trận đấu', type: [PlayerMatchStatisticItemDto] })
  items: PlayerMatchStatisticItemDto[];

  @ApiProperty({ description: 'Thông tin phân trang' })
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
