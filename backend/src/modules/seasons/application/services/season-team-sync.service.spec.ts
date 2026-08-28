import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeasonTeamSyncService } from './season-team-sync.service';
import { FootballApiClient } from '../../../external-football/application/ports/football-api-client.port';
import { PersistSeasonTeamsUseCase } from '../use-cases/persist-season-teams.use-case';
import { PersistTeamUseCase } from '../../../teams/application/use-cases/persist-team.use-case';
import { CompetitionWriteRepository } from '../../../competitions/application/ports/competition-write.repository';
import { SeasonReadRepository } from '../ports/season-read.repository';
import { SeasonWriteRepository } from '../ports/season-write.repository';
import { ExternalTeamListDto } from '../../../external-football/infrastructure/dto/external-team.dto';
import { CompetitionOrmEntity } from '../../../competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';
import { TeamOrmEntity } from '../../../teams/infrastructure/persistence/typeorm/entities/team.orm-entity';

describe('SeasonTeamSyncService', () => {
  let service: SeasonTeamSyncService;
  let mockFootballApiClient: jest.Mocked<FootballApiClient>;
  let mockPersistSeasonTeamsUseCase: jest.Mocked<PersistSeasonTeamsUseCase>;
  let mockPersistTeamUseCase: jest.Mocked<PersistTeamUseCase>;
  let mockCompRepo: jest.Mocked<CompetitionWriteRepository>;
  let mockSeasonReadRepo: jest.Mocked<SeasonReadRepository>;
  let mockSeasonWriteRepo: jest.Mocked<SeasonWriteRepository>;

  const mockCompetition: CompetitionOrmEntity = {
    id: 'comp-uuid-1',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: 'PL',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: null,
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const mockSeason: SeasonOrmEntity = {
    id: 'season-uuid-1',
    competitionId: 'comp-uuid-1',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2026',
    seasonCode: '2026',
    name: 'Premier League 2026/27',
    startDate: '2026-08-01',
    endDate: '2027-05-30',
    isCurrent: true,
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: mockCompetition,
    matches: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  const mockTeamEntity: TeamOrmEntity = {
    id: 'team-uuid-1',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    players: [],
    teamHistory: [],
    homeMatches: [],
    awayMatches: [],
    matchStatistics: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  const mockTeamListDto: ExternalTeamListDto = {
    count: 1,
    teams: [
      {
        id: 66,
        name: 'Manchester United FC',
        shortName: 'Man United',
        tla: 'MUN',
      },
    ],
  };

  beforeEach(() => {
    mockFootballApiClient = {
      getCompetitions: jest.fn(),
      getCompetitionById: jest.fn(),
      getTeams: jest.fn().mockResolvedValue(mockTeamListDto),
      getTeamById: jest.fn(),
      getMatches: jest.fn(),
      getMatchById: jest.fn(),
      getPlayers: jest.fn(),
      getPlayerById: jest.fn(),
    } as any;

    mockPersistSeasonTeamsUseCase = {
      execute: jest.fn().mockResolvedValue({
        seasonId: 'season-uuid-1',
        totalLinked: 1,
        seasonTeams: [{ seasonId: 'season-uuid-1', teamId: 'team-uuid-1' } as any],
      }),
    } as any;

    mockPersistTeamUseCase = {
      execute: jest.fn().mockResolvedValue(mockTeamEntity),
      executeMany: jest.fn(),
    } as any;

    mockCompRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue(mockCompetition),
      upsert: jest.fn(),
    };

    mockSeasonReadRepo = {
      findByCompetition: jest.fn().mockResolvedValue([mockSeason]),
      findCurrentByCompetitionId: jest.fn().mockResolvedValue(mockSeason),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    mockSeasonWriteRepo = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    service = new SeasonTeamSyncService(
      mockFootballApiClient,
      mockPersistSeasonTeamsUseCase,
      mockPersistTeamUseCase,
      mockCompRepo,
      mockSeasonReadRepo,
      mockSeasonWriteRepo,
    );
  });

  it('should extract teams, resolve competition and season, persist teams, and link to season_teams', async () => {
    const result = await service.syncSeasonTeams('PL', 2026);

    expect(mockFootballApiClient.getTeams).toHaveBeenCalledWith({
      competitionCode: 'PL',
      season: 2026,
    });
    expect(mockCompRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      'PL',
    );
    expect(mockPersistTeamUseCase.execute).toHaveBeenCalled();
    expect(mockPersistSeasonTeamsUseCase.execute).toHaveBeenCalledWith({
      seasonId: 'season-uuid-1',
      teamIds: ['team-uuid-1'],
    });

    expect(result).toEqual({
      competitionId: 'comp-uuid-1',
      seasonId: 'season-uuid-1',
      seasonName: 'Premier League 2026/27',
      totalTeamsSynced: 1,
      teamIds: ['team-uuid-1'],
    });
  });

  it('should throw NotFoundException when competition is not in DB', async () => {
    mockCompRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(service.syncSeasonTeams('PL')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException when season is not in DB', async () => {
    mockSeasonReadRepo.findCurrentByCompetitionId.mockResolvedValue(null);
    mockSeasonReadRepo.findByCompetition.mockResolvedValue([]);

    await expect(service.syncSeasonTeams('PL')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException when competitionCode is empty', async () => {
    await expect(service.syncSeasonTeams('')).rejects.toThrow(
      BadRequestException,
    );
  });
});
