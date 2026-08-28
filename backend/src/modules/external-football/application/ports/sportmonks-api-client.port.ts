import {
  SportmonksFixtureDto,
  SportmonksFixtureListDto,
} from '../../infrastructure/dto/sportmonks-fixture.dto';

export const SPORTMONKS_API_CLIENT = Symbol('SPORTMONKS_API_CLIENT');

export interface GetSportmonksFixturesParams {
  includes?: string[];
  filters?: Record<string, string | number>;
  page?: number;
  perPage?: number;
}

export interface SportmonksApiClient {
  getFixtureById(
    id: number | string,
    includes?: string[],
  ): Promise<SportmonksFixtureDto>;

  getFixturesByDate(
    date: string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto>;

  getFixturesByDateRange(
    startDate: string,
    endDate: string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto>;

  getFixturesBySeason(
    seasonId: number | string,
    includes?: string[],
  ): Promise<SportmonksFixtureListDto>;
}
