/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SearchPlayersUseCase } from './search-players.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';
import { CompetitionReadRepository } from 'src/modules/competitions/application/ports/competition-read.repository';
import { SeasonReadRepository } from 'src/modules/seasons/application/ports/season-read.repository';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';
import { TeamOrmEntity } from 'src/modules/teams/infrastructure/persistence/typeorm/entities/team.orm-entity';
import { CompetitionOrmEntity } from 'src/modules/competitions/infrastructure/persistence/typeorm/entities/competition.orm-entity';
import { SeasonOrmEntity } from 'src/modules/seasons/infrastructure/persistence/typeorm/entities/season.orm-entity';
import { SearchPlayersQueryDto } from '../../presentation/http/dto/search-players-query.dto';

describe('SearchPlayersUseCase (Unit)', () => {
  let useCase: SearchPlayersUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;
  let mockCompRepo: jest.Mocked<CompetitionReadRepository>;
  let mockSeasonRepo: jest.Mocked<SeasonReadRepository>;

  const mockTeam: TeamOrmEntity = {
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
  };

  const mockPlayerWithTeam: PlayerOrmEntity = {
    id: 'player-saka-uuid',
    currentTeamId: 'team-ars-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: '1234',
    name: 'Bukayo Saka',
    normalizedName: 'bukayo saka',
    shortName: 'B. Saka',
    dateOfBirth: '2001-09-05',
    nationality: 'England',
    heightCm: 178,
    weightKg: 72,
    preferredFoot: 'LEFT',
    primaryPosition: 'RW',
    shirtNumber: 7,
    imageUrl: 'saka.png',
    status: 'ACTIVE',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    currentTeam: mockTeam,
    positions: [],
    teamHistory: [],
    matchStatistics: [],
    seasonStatistics: [],
  };

  const mockCompetition: CompetitionOrmEntity = {
    id: 'comp-pl-uuid',
    externalProvider: 'API_FOOTBALL',
    externalId: 'PL',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'logo.png',
    dataUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  const mockSeason: SeasonOrmEntity = {
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

  beforeEach(() => {
    mockPlayerRepo = {
      search: jest.fn(),
      findById: jest.fn(),
    };
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

    useCase = new SearchPlayersUseCase(
      mockPlayerRepo,
      mockCompRepo,
      mockSeasonRepo,
    );
  });

  it('should throw BadRequestException if minAge > maxAge', async () => {
    const query: SearchPlayersQueryDto = {
      minAge: 25,
      maxAge: 20,
      limit: 20,
      offset: 0,
    };
    await expect(useCase.execute(query)).rejects.toThrow(
      new BadRequestException('minAge không được lớn hơn maxAge'),
    );
  });

  it('should throw BadRequestException if minHeightCm > maxHeightCm', async () => {
    const query: SearchPlayersQueryDto = {
      minHeightCm: 190,
      maxHeightCm: 170,
      limit: 20,
      offset: 0,
    };
    await expect(useCase.execute(query)).rejects.toThrow(
      new BadRequestException('minHeightCm không được lớn hơn maxHeightCm'),
    );
  });

  it('should throw NotFoundException if competitionId does not exist', async () => {
    mockCompRepo.findById.mockResolvedValue(null);
    const query: SearchPlayersQueryDto = {
      competitionId: 'invalid-comp-id',
      limit: 20,
      offset: 0,
    };
    await expect(useCase.execute(query)).rejects.toThrow(
      new NotFoundException('Giải đấu không tồn tại'),
    );
  });

  it('should throw NotFoundException if competition has no current season', async () => {
    mockCompRepo.findById.mockResolvedValue(mockCompetition);
    mockSeasonRepo.findCurrentByCompetitionId.mockResolvedValue(null);

    const query: SearchPlayersQueryDto = {
      competitionId: 'comp-pl-uuid',
      limit: 20,
      offset: 0,
    };
    await expect(useCase.execute(query)).rejects.toThrow(
      new NotFoundException('Không tìm thấy mùa giải hiện tại của giải đấu'),
    );
  });

  it('should resolve competitionId to currentSeasonId and call playerReadRepository.search', async () => {
    mockCompRepo.findById.mockResolvedValue(mockCompetition);
    mockSeasonRepo.findCurrentByCompetitionId.mockResolvedValue(mockSeason);
    mockPlayerRepo.search.mockResolvedValue({
      items: [mockPlayerWithTeam],
      total: 1,
    });

    const query: SearchPlayersQueryDto = {
      competitionId: 'comp-pl-uuid',
      limit: 20,
      offset: 0,
    };

    const result = await useCase.execute(query);

    expect(mockPlayerRepo.search).toHaveBeenCalledWith({
      ...query,
      currentSeasonId: 'season-2025-uuid',
    });
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({ limit: 20, offset: 0, total: 1 });
  });
});
