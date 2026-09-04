export interface ApiFootballPagingDto {
  current: number;
  total: number;
}

export interface ApiFootballPlayerProfileDto {
  id: number;
  name: string;
  firstname?: string | null;
  lastname?: string | null;
  age?: number | null;
  birth?: {
    date?: string | null;
    place?: string | null;
    country?: string | null;
  } | null;
  nationality?: string | null;
  height?: string | null;
  weight?: string | null;
  injured?: boolean | null;
  photo?: string | null;
  position?: string | null;
}

export interface ApiFootballPlayerTeamStatisticsDto {
  team?: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
  league?: {
    id: number;
    name: string;
    country?: string | null;
    logo?: string | null;
    flag?: string | null;
    season?: number | null;
  } | null;
  games?: {
    appearences?: number | null;
    lineups?: number | null;
    minutes?: number | null;
    number?: number | null;
    position?: string | null;
    rating?: string | null;
    captain?: boolean | null;
  } | null;
  substitutes?: {
    in?: number | null;
    out?: number | null;
    bench?: number | null;
  } | null;
  shots?: {
    total?: number | null;
    on?: number | null;
  } | null;
  goals?: {
    total?: number | null;
    conceded?: number | null;
    assists?: number | null;
    saves?: number | null;
  } | null;
  passes?: {
    total?: number | null;
    key?: number | null;
    accuracy?: number | null;
  } | null;
  tackles?: {
    total?: number | null;
    blocks?: number | null;
    interceptions?: number | null;
  } | null;
  duels?: {
    total?: number | null;
    won?: number | null;
  } | null;
  dribbles?: {
    attempts?: number | null;
    success?: number | null;
    past?: number | null;
  } | null;
  fouls?: {
    drawn?: number | null;
    committed?: number | null;
  } | null;
  cards?: {
    yellow?: number | null;
    yellowred?: number | null;
    red?: number | null;
  } | null;
  penalty?: {
    won?: number | null;
    committed?: number | null;
    scored?: number | null;
    missed?: number | null;
    saved?: number | null;
  } | null;
}

export interface ApiFootballPlayerItemDto {
  player: ApiFootballPlayerProfileDto;
  statistics?: ApiFootballPlayerTeamStatisticsDto[];
}

export interface ApiFootballPlayerListResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[] | Record<string, any>;
  results: number;
  paging?: ApiFootballPagingDto;
  response: ApiFootballPlayerItemDto[];
}

export interface ApiFootballSquadPlayerDto {
  id: number;
  name: string;
  age?: number | null;
  number?: number | null;
  position?: string | null;
  photo?: string | null;
}

export interface ApiFootballSquadItemDto {
  team: {
    id: number;
    name: string;
    logo?: string | null;
  };
  players: ApiFootballSquadPlayerDto[];
}

export interface ApiFootballSquadResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[] | Record<string, any>;
  results: number;
  paging?: ApiFootballPagingDto;
  response: ApiFootballSquadItemDto[];
}

export interface ApiFootballTransferItemDto {
  player: {
    id: number;
    name: string;
  };
  update: string;
  transfers: Array<{
    date: string;
    type: string;
    teams: {
      in: { id: number; name: string; logo?: string | null };
      out: { id: number; name: string; logo?: string | null };
    };
  }>;
}

export interface ApiFootballTransfersResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[] | Record<string, any>;
  results: number;
  paging?: ApiFootballPagingDto;
  response: ApiFootballTransferItemDto[];
}

export interface ApiFootballInjuryItemDto {
  player: {
    id: number;
    name: string;
    photo?: string | null;
    type?: string | null;
    reason?: string | null;
  };
  team: {
    id: number;
    name: string;
    logo?: string | null;
  };
  fixture: {
    id: number;
    timezone?: string;
    date: string;
    timestamp?: number;
  };
  league: {
    id: number;
    season: number;
    name: string;
    country?: string | null;
    logo?: string | null;
    flag?: string | null;
  };
}

export interface ApiFootballInjuriesResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[] | Record<string, any>;
  results: number;
  paging?: ApiFootballPagingDto;
  response: ApiFootballInjuryItemDto[];
}
