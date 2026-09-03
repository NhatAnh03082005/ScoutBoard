export interface ApiFootballLeagueItemDto {
  id: number;
  name: string;
  type: string;
  logo: string | null;
}

export interface ApiFootballCountryDto {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface ApiFootballSeasonCoverageDto {
  fixtures?: {
    events?: boolean;
    lineups?: boolean;
    statistics_fixtures?: boolean;
    statistics_players?: boolean;
  };
  standings?: boolean;
  players?: boolean;
  top_scorers?: boolean;
  top_assists?: boolean;
  top_cards?: boolean;
  injuries?: boolean;
  predictions?: boolean;
  odds?: boolean;
}

export interface ApiFootballSeasonItemDto {
  year: number;
  start: string;
  end: string;
  current: boolean;
  coverage?: ApiFootballSeasonCoverageDto;
}

export interface ApiFootballLeagueResponseItemDto {
  league: ApiFootballLeagueItemDto;
  country: ApiFootballCountryDto;
  seasons: ApiFootballSeasonItemDto[];
}

export interface ApiFootballLeagueListResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballLeagueResponseItemDto[];
}
