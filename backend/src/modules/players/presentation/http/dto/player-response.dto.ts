import { ApiProperty } from '@nestjs/swagger';

export class PlayerTeamResponseDto {
  @ApiProperty({ description: 'ID của đội bóng' })
  id: string;

  @ApiProperty({ description: 'Tên đầy đủ của đội bóng' })
  name: string;

  @ApiProperty({ description: 'Tên ngắn của đội bóng', nullable: true })
  shortName: string | null;

  @ApiProperty({ description: 'Logo đội bóng', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ description: 'Quốc gia', nullable: true })
  country: string | null;
}

export class PlayerItemDto {
  @ApiProperty({ description: 'ID của cầu thủ (UUID)' })
  id: string;

  @ApiProperty({ description: 'Họ và tên đầy đủ của cầu thủ' })
  fullName: string;

  @ApiProperty({ description: 'Hình ảnh cầu thủ', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ description: 'Ngày sinh (YYYY-MM-DD)', nullable: true })
  dateOfBirth: string | null;

  @ApiProperty({ description: 'Quốc tịch', nullable: true })
  nationality: string | null;

  @ApiProperty({ description: 'Chân thuận (LEFT/RIGHT/BOTH)', nullable: true })
  preferredFoot: string | null;

  @ApiProperty({ description: 'Chiều cao (cm)', nullable: true })
  heightCm: number | null;

  @ApiProperty({ description: 'Vị trí sở trường chính', nullable: true })
  primaryPosition: string | null;

  @ApiProperty({
    description: 'Thông tin CLB hiện tại',
    type: PlayerTeamResponseDto,
    nullable: true,
  })
  currentTeam: PlayerTeamResponseDto | null;
}

export class PaginationMetadataDto {
  @ApiProperty({ description: 'Số lượng bản ghi mỗi trang' })
  limit: number;

  @ApiProperty({ description: 'Số lượng bản ghi bỏ qua' })
  offset: number;

  @ApiProperty({ description: 'Tổng số bản ghi thỏa mãn điều kiện' })
  total: number;
}

export class PlayerListResponseDto {
  @ApiProperty({
    description: 'Danh sách cầu thủ',
    type: [PlayerItemDto],
  })
  items: PlayerItemDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    type: PaginationMetadataDto,
  })
  pagination: PaginationMetadataDto;
}
