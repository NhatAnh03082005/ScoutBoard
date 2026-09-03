export interface ApiFootballTeamDetailsDto {
  id: number;
  name: string;
  code: string | null;
  country: string;
  founded: number | null;
  national: boolean;
  logo: string | null;
}

export interface ApiFootballVenueDto {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}

export interface ApiFootballTeamResponseItemDto {
  team: ApiFootballTeamDetailsDto;
  venue: ApiFootballVenueDto;
}

export interface ApiFootballTeamListResponseDto {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: ApiFootballTeamResponseItemDto[];
}
