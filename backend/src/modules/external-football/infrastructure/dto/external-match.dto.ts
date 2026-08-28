import { ExternalRateLimitMeta } from './external-rate-limit.dto';

export interface ExternalMatchTeamDto {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

export interface ExternalMatchScoreDto {
  winner?: string | null;
  duration?: string | null;
  fullTime?: {
    home?: number | null;
    away?: number | null;
  };
  halfTime?: {
    home?: number | null;
    away?: number | null;
  };
}

export interface ExternalMatchDto {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;
  stage?: string | null;
  group?: string | null;
  lastUpdated?: string | null;
  homeTeam: ExternalMatchTeamDto;
  awayTeam: ExternalMatchTeamDto;
  score?: ExternalMatchScoreDto | null;
}

export interface ExternalMatchDetailDto extends ExternalMatchDto {
  competition?: {
    id: number;
    name: string;
    code: string;
    type?: string;
    emblem?: string | null;
  };
  season?: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday?: number | null;
  };
  referees?: Array<{
    id: number;
    name: string;
    type?: string;
    nationality?: string | null;
  }>;
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface ExternalMatchListDto {
  count: number;
  matches: ExternalMatchDto[];
  rateLimitMeta?: ExternalRateLimitMeta;
}
