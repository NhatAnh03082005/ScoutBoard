import { ExternalRateLimitMeta } from './external-rate-limit.dto';

export interface SportmonksParticipantDto {
  id: number;
  name: string;
  short_code?: string | null;
  image_path?: string | null;
  meta?: {
    location?: 'home' | 'away';
    winner?: boolean | null;
    position?: number | null;
  };
}

export interface SportmonksScoreDto {
  id?: number;
  fixture_id?: number;
  type_id?: number;
  participant_id?: number;
  score?: {
    goals?: number | null;
    participant?: 'home' | 'away';
  };
  description?: string | null;
}

export interface SportmonksLineupDetailDto {
  id?: number;
  type_id?: number;
  code?: string;
  type?: {
    id?: number;
    name?: string;
    code?: string;
    developer_name?: string;
  };
  value?: number | string | Record<string, any> | null;
  data?: any;
}

export interface SportmonksLineupDto {
  id: number;
  fixture_id: number;
  player_id: number;
  team_id: number;
  position_id?: number | null;
  formation_position?: number | null;
  formation_field?: string | null;
  type_id?: number | null; // 11 = lineup, 12 = bench/substitute
  jersey_number?: number | null;
  player_name?: string | null;
  player?: {
    id: number;
    name: string;
    display_name?: string | null;
    image_path?: string | null;
    position_id?: number | null;
    date_of_birth?: string | null;
    nationality_id?: number | null;
  };
  details?: SportmonksLineupDetailDto[];
}

export interface SportmonksEventDto {
  id: number;
  fixture_id: number;
  period_id?: number;
  participant_id?: number;
  type_id?: number;
  minute?: number;
  extra_minute?: number | null;
  player_id?: number | null;
  related_player_id?: number | null;
  player_name?: string | null;
  related_player_name?: string | null;
  result?: string | null;
}

export interface SportmonksFixtureDto {
  id: number;
  name: string;
  starting_at: string;
  starting_at_timestamp?: number;
  league_id?: number | null;
  season_id?: number | null;
  round_id?: number | null;
  stage_id?: number | null;
  venue_id?: number | null;
  state_id?: number | null;
  result_info?: string | null;
  participants?: SportmonksParticipantDto[];
  scores?: SportmonksScoreDto[];
  lineups?: SportmonksLineupDto[];
  events?: SportmonksEventDto[];
  statistics?: any[];
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface SportmonksFixtureResponseDto {
  data: SportmonksFixtureDto;
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface SportmonksFixtureListDto {
  data: SportmonksFixtureDto[];
  pagination?: {
    count?: number;
    per_page?: number;
    current_page?: number;
    next_page?: string | null;
    has_more?: boolean;
  };
  rateLimitMeta?: ExternalRateLimitMeta;
}
