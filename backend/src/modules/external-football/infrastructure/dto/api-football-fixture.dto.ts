export interface ApiFootballFixtureStatusDto {
  long: string;
  short: string;
  elapsed: number | null;
}

export interface ApiFootballFixtureDetailsDto {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: ApiFootballFixtureStatusDto;
}

export interface ApiFootballFixtureLeagueDto {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  flag: string | null;
  season: number;
  round: string;
}

export interface ApiFootballFixtureTeamItemDto {
  id: number;
  name: string;
  logo: string | null;
  winner: boolean | null;
}

export interface ApiFootballFixtureTeamsDto {
  home: ApiFootballFixtureTeamItemDto;
  away: ApiFootballFixtureTeamItemDto;
}

export interface ApiFootballFixtureGoalsDto {
  home: number | null;
  away: number | null;
}

export interface ApiFootballFixtureScoreItemDto {
  home: number | null;
  away: number | null;
}

export interface ApiFootballFixtureScoreDto {
  halftime: ApiFootballFixtureScoreItemDto;
  fulltime: ApiFootballFixtureScoreItemDto;
  extratime: ApiFootballFixtureScoreItemDto;
  penalty: ApiFootballFixtureScoreItemDto;
}

export interface ApiFootballFixtureResponseItemDto {
  fixture: ApiFootballFixtureDetailsDto;
  league: ApiFootballFixtureLeagueDto;
  teams: ApiFootballFixtureTeamsDto;
  goals: ApiFootballFixtureGoalsDto;
  score: ApiFootballFixtureScoreDto;
}

export interface ApiFootballFixtureListResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballFixtureResponseItemDto[];
}
