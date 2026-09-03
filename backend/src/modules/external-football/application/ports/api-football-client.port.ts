import {
  ApiFootballPlayerListResponseDto,
  ApiFootballSquadResponseDto,
  ApiFootballTransfersResponseDto,
  ApiFootballInjuriesResponseDto,
} from '../../infrastructure/dto/api-football-player.dto';
import { ApiFootballLeagueListResponseDto } from '../../infrastructure/dto/api-football-league.dto';
import { ApiFootballTeamListResponseDto } from '../../infrastructure/dto/api-football-team.dto';
import { ApiFootballFixtureListResponseDto } from '../../infrastructure/dto/api-football-fixture.dto';
import { ApiFootballFixturePlayersListResponseDto } from '../../infrastructure/dto/api-football-fixture-player.dto';

export const API_FOOTBALL_CLIENT = Symbol('API_FOOTBALL_CLIENT');

export interface GetApiFootballLeaguesParams {
  id?: number;
  name?: string;
  country?: string;
  code?: string;
  season?: number;
  team?: number;
  type?: string;
  current?: string | boolean;
  search?: string;
  last?: number;
}

export interface GetApiFootballTeamsParams {
  id?: number;
  name?: string;
  league?: number;
  season?: number;
  country?: string;
  code?: string;
  venue?: number;
  search?: string;
}

export interface GetApiFootballFixturesParams {
  id?: number;
  ids?: string;
  live?: string;
  date?: string;
  league?: number;
  season?: number;
  team?: number;
  last?: number;
  next?: number;
  from?: string;
  to?: string;
  round?: string;
  status?: string;
  venue?: number;
  timezone?: string;
}

export interface GetApiFootballFixturePlayersParams {
  fixture: number;
  team?: number;
}

export interface GetApiFootballPlayersParams {
  id?: number;
  name?: string;
  search?: string;
  team?: number;
  league?: number;
  season?: number;
  page?: number;
}

export interface GetApiFootballSquadParams {
  team: number;
  player?: number;
}

export interface GetApiFootballTransfersParams {
  player?: number;
  team?: number;
}

export interface GetApiFootballInjuriesParams {
  league?: number;
  season?: number;
  team?: number;
  player?: number;
  date?: string;
}

export interface ApiFootballClientPort {
  getLeagues(
    params: GetApiFootballLeaguesParams,
  ): Promise<ApiFootballLeagueListResponseDto>;
  getTeams(
    params: GetApiFootballTeamsParams,
  ): Promise<ApiFootballTeamListResponseDto>;
  getFixtures(
    params: GetApiFootballFixturesParams,
  ): Promise<ApiFootballFixtureListResponseDto>;
  getFixturePlayers(
    params: GetApiFootballFixturePlayersParams,
  ): Promise<ApiFootballFixturePlayersListResponseDto>;
  getPlayers(
    params: GetApiFootballPlayersParams,
  ): Promise<ApiFootballPlayerListResponseDto>;
  getPlayerById(
    id: number,
    season?: number,
  ): Promise<ApiFootballPlayerListResponseDto>;
  getSquadByTeam(
    params: GetApiFootballSquadParams,
  ): Promise<ApiFootballSquadResponseDto>;
  getTransfers(
    params: GetApiFootballTransfersParams,
  ): Promise<ApiFootballTransfersResponseDto>;
  getInjuries(
    params: GetApiFootballInjuriesParams,
  ): Promise<ApiFootballInjuriesResponseDto>;
}
