import {
  ExternalCompetitionDetailDto,
  ExternalCompetitionListDto,
} from '../../infrastructure/dto/external-competition.dto';
import {
  ExternalTeamDetailDto,
  ExternalTeamListDto,
} from '../../infrastructure/dto/external-team.dto';
import {
  ExternalPlayerDetailDto,
  ExternalPlayerListDto,
} from '../../infrastructure/dto/external-player.dto';
import {
  ExternalMatchDetailDto,
  ExternalMatchListDto,
} from '../../infrastructure/dto/external-match.dto';

export const FOOTBALL_API_CLIENT = Symbol('FOOTBALL_API_CLIENT');

export interface GetCompetitionsParams {
  plan?: string;
  areas?: string;
}

export interface GetTeamsParams {
  competitionCode?: string;
  season?: number;
  limit?: number;
  offset?: number;
}

export interface GetMatchesParams {
  competitions?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  matchday?: number;
  season?: number;
  limit?: number;
  offset?: number;
}

export interface GetPlayersParams {
  teamId?: number;
  limit?: number;
  offset?: number;
}

export interface FootballApiClient {
  getCompetitions(params?: GetCompetitionsParams): Promise<ExternalCompetitionListDto>;
  getCompetitionById(idOrCode: string | number): Promise<ExternalCompetitionDetailDto>;
  getTeams(params?: GetTeamsParams): Promise<ExternalTeamListDto>;
  getTeamById(id: string | number): Promise<ExternalTeamDetailDto>;
  getMatches(params?: GetMatchesParams): Promise<ExternalMatchListDto>;
  getMatchById(id: string | number): Promise<ExternalMatchDetailDto>;
  getPlayers(params?: GetPlayersParams): Promise<ExternalPlayerListDto>;
  getPlayerById(id: string | number): Promise<ExternalPlayerDetailDto>;
  getPlayerMatches?(id: string | number, params?: GetMatchesParams): Promise<ExternalMatchListDto>;
}
