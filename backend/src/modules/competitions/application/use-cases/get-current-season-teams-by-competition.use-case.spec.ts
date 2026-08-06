import { NotFoundException } from '@nestjs/common';
import { GetCurrentSeasonTeamsByCompetitionUseCase } from './get-current-season-teams-by-competition.use-case';
import { CompetitionReadRepository } from '../ports/competition-read.repository';
import { SeasonReadRepository } from 'src/modules/seasons/application/ports/season-read.repository';
import { TeamReadRepository } from 'src/modules/teams/application/ports/team-read.repository';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('GetCurrentSeasonTeamsByCompetitionUseCase', () => {
  let useCase: GetCurrentSeasonTeamsByCompetitionUseCase;
  let mockCompRepo: CompetitionReadRepository;
  let mockSeasonRepo: SeasonReadRepository;
  let mockTeamRepo: TeamReadRepository;

  const mockCompetition: CompetitionOrmEntity = {
    id: 'comp-pl-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: 'PL',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const mockCurrentSeason: SeasonOrmEntity = {
    id: 'season-2025-uuid',
    competitionId: 'comp-pl-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: 'PL-2025',
    seasonCode: '2025-2026',
    name: 'Premier League 2025/26',
    startDate: '2025-08-15',
    endDate: '2026-05-24',
    isCurrent: true,
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: mockCompetition,
    matches: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  const mockTeams: TeamOrmEntity[] = [
    {
      id: 'team-ars-uuid',
      externalProvider: 'API_FOOTBALL',
      externalId: '57',
      name: 'Arsenal FC',
      shortName: 'Arsenal',
      tla: 'ARS',
      country: 'England',
      foundedYear: 1886,
      venueName: 'Emirates Stadium',
      logoUrl: 'https://crests.football-data.org/57.png',
      status: 'ACTIVE',
      dataUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      players: [],
      teamHistory: [],
      homeMatches: [],
      awayMatches: [],
      matchStatistics: [],
      seasonStatistics: [],
      seasonTeams: [],
    },
    {
      id: 'team-liv-uuid',
      externalProvider: 'API_FOOTBALL',
      externalId: '64',
      name: 'Liverpool FC',
      shortName: 'Liverpool',
      tla: 'LIV',
      country: 'England',
      foundedYear: 1892,
      venueName: 'Anfield',
      logoUrl: 'https://crests.football-data.org/64.png',
      status: 'ACTIVE',
      dataUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      players: [],
      teamHistory: [],
      homeMatches: [],
      awayMatches: [],
      matchStatistics: [],
      seasonStatistics: [],
      seasonTeams: [],
    },
    {
      id: 'team-mci-uuid',
      externalProvider: 'API_FOOTBALL',
      externalId: '65',
      name: 'Manchester City FC',
      shortName: 'Man City',
      tla: 'MCI',
      country: 'England',
      foundedYear: 1894,
      venueName: 'Etihad Stadium',
      logoUrl: 'https://crests.football-data.org/65.png',
      status: 'ACTIVE',
      dataUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      players: [],
      teamHistory: [],
      homeMatches: [],
      awayMatches: [],
      matchStatistics: [],
      seasonStatistics: [],
      seasonTeams: [],
    },
  ];

  beforeEach(() => {
    mockCompRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    mockSeasonRepo = {
      findAll: jest.fn(),
      findByCompetition: jest.fn(),
      findById: jest.fn(),
      findCurrentByCompetitionId: jest.fn(),
    };

    mockTeamRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySeasonId: jest.fn(),
    };

    useCase = new GetCurrentSeasonTeamsByCompetitionUseCase(
      mockCompRepo,
      mockSeasonRepo,
      mockTeamRepo,
    );
  });

  it('should throw NotFoundException when competition does not exist', async () => {
    const findCompSpy = jest
      .spyOn(mockCompRepo, 'findById')
      .mockResolvedValue(null);
    const findCurrentSeasonSpy = jest.spyOn(
      mockSeasonRepo,
      'findCurrentByCompetitionId',
    );

    await expect(useCase.execute('invalid-comp-uuid')).rejects.toThrow(
      new NotFoundException('Giải đấu không tồn tại'),
    );

    expect(findCompSpy).toHaveBeenCalledWith('invalid-comp-uuid');
    expect(findCurrentSeasonSpy).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when competition has no current season', async () => {
    const findCompSpy = jest
      .spyOn(mockCompRepo, 'findById')
      .mockResolvedValue(mockCompetition);
    const findCurrentSeasonSpy = jest
      .spyOn(mockSeasonRepo, 'findCurrentByCompetitionId')
      .mockResolvedValue(null);
    const findTeamsSpy = jest.spyOn(mockTeamRepo, 'findBySeasonId');

    await expect(useCase.execute('comp-pl-uuid')).rejects.toThrow(
      new NotFoundException('Không tìm thấy mùa giải hiện tại của giải đấu'),
    );

    expect(findCompSpy).toHaveBeenCalledWith('comp-pl-uuid');
    expect(findCurrentSeasonSpy).toHaveBeenCalledWith('comp-pl-uuid');
    expect(findTeamsSpy).not.toHaveBeenCalled();
  });

  it('should return empty array when current season has no season_teams', async () => {
    jest.spyOn(mockCompRepo, 'findById').mockResolvedValue(mockCompetition);
    jest
      .spyOn(mockSeasonRepo, 'findCurrentByCompetitionId')
      .mockResolvedValue(mockCurrentSeason);
    const findTeamsSpy = jest
      .spyOn(mockTeamRepo, 'findBySeasonId')
      .mockResolvedValue([]);

    const result = await useCase.execute('comp-pl-uuid');

    expect(result).toEqual([]);
    expect(findTeamsSpy).toHaveBeenCalledWith('season-2025-uuid');
  });

  it('should return mapped team DTOs for current season sorted A-Z', async () => {
    jest.spyOn(mockCompRepo, 'findById').mockResolvedValue(mockCompetition);
    jest
      .spyOn(mockSeasonRepo, 'findCurrentByCompetitionId')
      .mockResolvedValue(mockCurrentSeason);
    const findTeamsSpy = jest
      .spyOn(mockTeamRepo, 'findBySeasonId')
      .mockResolvedValue(mockTeams);

    const result = await useCase.execute('comp-pl-uuid');

    expect(result).toEqual([
      {
        id: 'team-ars-uuid',
        name: 'Arsenal FC',
        shortName: 'Arsenal',
        country: 'England',
        logoUrl: 'https://crests.football-data.org/57.png',
      },
      {
        id: 'team-liv-uuid',
        name: 'Liverpool FC',
        shortName: 'Liverpool',
        country: 'England',
        logoUrl: 'https://crests.football-data.org/64.png',
      },
      {
        id: 'team-mci-uuid',
        name: 'Manchester City FC',
        shortName: 'Man City',
        country: 'England',
        logoUrl: 'https://crests.football-data.org/65.png',
      },
    ]);
    expect(findTeamsSpy).toHaveBeenCalledWith('season-2025-uuid');
  });

  it('should not include internal relations or timestamps in response DTO', async () => {
    jest.spyOn(mockCompRepo, 'findById').mockResolvedValue(mockCompetition);
    jest
      .spyOn(mockSeasonRepo, 'findCurrentByCompetitionId')
      .mockResolvedValue(mockCurrentSeason);
    jest
      .spyOn(mockTeamRepo, 'findBySeasonId')
      .mockResolvedValue([mockTeams[0]]);

    const result = await useCase.execute('comp-pl-uuid');

    expect(result[0]).not.toHaveProperty('createdAt');
    expect(result[0]).not.toHaveProperty('updatedAt');
    expect(result[0]).not.toHaveProperty('seasonTeams');
    expect(result[0]).not.toHaveProperty('competitionId');
  });
});
