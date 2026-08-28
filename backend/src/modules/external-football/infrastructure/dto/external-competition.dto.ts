import { ExternalRateLimitMeta } from './external-rate-limit.dto';

export interface ExternalSeasonDto {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday?: number | null;
  winner?: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  } | null;
}

export interface ExternalCompetitionDto {
  id: number;
  area: {
    id: number;
    name: string;
    code: string;
    flag?: string | null;
  };
  name: string;
  code: string;
  type: string;
  emblem?: string | null;
  plan?: string;
  currentSeason?: ExternalSeasonDto | null;
  numberOfAvailableSeasons?: number;
  lastUpdated?: string;
}

export interface ExternalCompetitionDetailDto extends ExternalCompetitionDto {
  seasons?: ExternalSeasonDto[];
  rateLimitMeta?: ExternalRateLimitMeta;
}

export interface ExternalCompetitionListDto {
  count: number;
  competitions: ExternalCompetitionDto[];
  rateLimitMeta?: ExternalRateLimitMeta;
}
