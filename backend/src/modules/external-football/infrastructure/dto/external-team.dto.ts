import { ExternalRateLimitMeta } from './external-rate-limit.dto';
import { ExternalPlayerDto } from './external-player.dto';

export interface ExternalTeamDto {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
  address?: string | null;
  website?: string | null;
  founded?: number | null;
  clubColors?: string | null;
  venue?: string | null;
  runningCompetitions?: Array<{
    id: number;
    name: string;
    code: string;
    type: string;
    emblem?: string | null;
  }>;
}

export interface ExternalTeamDetailDto extends ExternalTeamDto {
  squad?: ExternalPlayerDto[];
  coach?: {
    id: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    dateOfBirth?: string;
    nationality?: string;
    contract?: {
      start?: string;
      until?: string;
    };
  } | null;
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface ExternalTeamListDto {
  count: number;
  teams: ExternalTeamDto[];
  rateLimitMeta?: ExternalRateLimitMeta;
}
