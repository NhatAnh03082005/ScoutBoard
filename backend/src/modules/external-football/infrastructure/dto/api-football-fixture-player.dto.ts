export interface ApiFootballFixturePlayerGamesDto {
  minutes: number | null;
  number: number | null;
  position: string | null;
  rating: string | null;
  captain: boolean | null;
  substitute: boolean | null;
}

export interface ApiFootballFixturePlayerShotsDto {
  total: number | null;
  on: number | null;
}

export interface ApiFootballFixturePlayerGoalsDto {
  total: number | null;
  conceded: number | null;
  assists: number | null;
  saves: number | null;
}

export interface ApiFootballFixturePlayerPassesDto {
  total: number | null;
  key: number | null;
  accuracy: string | null;
}

export interface ApiFootballFixturePlayerTacklesDto {
  total: number | null;
  blocks: number | null;
  interceptions: number | null;
}

export interface ApiFootballFixturePlayerDuelsDto {
  total: number | null;
  won: number | null;
}

export interface ApiFootballFixturePlayerDribblesDto {
  attempts: number | null;
  success: number | null;
  past: number | null;
}

export interface ApiFootballFixturePlayerFoulsDto {
  drawn: number | null;
  committed: number | null;
}

export interface ApiFootballFixturePlayerCardsDto {
  yellow: number | null;
  red: number | null;
}

export interface ApiFootballFixturePlayerPenaltyDto {
  won: number | null;
  commited: number | null;
  scored: number | null;
  missed: number | null;
  saved: number | null;
}

export interface ApiFootballFixturePlayerStatisticItemDto {
  games: ApiFootballFixturePlayerGamesDto;
  offsides: number | null;
  shots: ApiFootballFixturePlayerShotsDto;
  goals: ApiFootballFixturePlayerGoalsDto;
  passes: ApiFootballFixturePlayerPassesDto;
  tackles: ApiFootballFixturePlayerTacklesDto;
  duels: ApiFootballFixturePlayerDuelsDto;
  dribbles: ApiFootballFixturePlayerDribblesDto;
  fouls: ApiFootballFixturePlayerFoulsDto;
  cards: ApiFootballFixturePlayerCardsDto;
  penalty: ApiFootballFixturePlayerPenaltyDto;
}

export interface ApiFootballFixturePlayerItemDto {
  player: {
    id: number;
    name: string;
    photo: string | null;
  };
  statistics: ApiFootballFixturePlayerStatisticItemDto[];
}

export interface ApiFootballFixtureTeamPlayersResponseDto {
  team: {
    id: number;
    name: string;
    logo: string | null;
    update?: string | null;
  };
  players: ApiFootballFixturePlayerItemDto[];
}

export interface ApiFootballFixturePlayersListResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballFixtureTeamPlayersResponseDto[];
}
