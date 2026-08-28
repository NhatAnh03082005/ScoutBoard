import { ExternalRateLimitMeta } from './external-rate-limit.dto';

export interface ExternalPlayerDto {
  id: number;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  section?: string | null;
  position?: string | null;
  shirtNumber?: number | null;
  lastUpdated?: string | null;
}

export interface ExternalPlayerDetailDto extends ExternalPlayerDto {
  currentTeam?: {
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
    contract?: {
      start?: string | null;
      until?: string | null;
    } | null;
  } | null;
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface ExternalPlayerListDto {
  count: number;
  players: ExternalPlayerDto[];
  rateLimitMeta?: ExternalRateLimitMeta;
}
