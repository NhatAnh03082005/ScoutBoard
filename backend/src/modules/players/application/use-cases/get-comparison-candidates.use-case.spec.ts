import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetComparisonCandidatesUseCase } from './get-comparison-candidates.use-case';
import { PlayerReadRepository } from '../ports/player-read.repository';
import { ComparisonScope } from '../../domain/enums/comparison-scope.enum';
import { PreferredFoot } from '../../domain/enums/preferred-foot.enum';
import { PlayerOrmEntity } from '../../infrastructure/persistence/typeorm/entities/player.orm-entity';

describe('GetComparisonCandidatesUseCase', () => {
  let useCase: GetComparisonCandidatesUseCase;
  let mockPlayerRepo: jest.Mocked<PlayerReadRepository>;

  const mockCurrentPlayer = {
    id: 'saka-id',
    name: 'Bukayo Saka',
  } as PlayerOrmEntity;

  const mockCandidatePlayer = {
    id: 'palmer-id',
    name: 'Cole Palmer',
    shortName: 'Palmer',
    dateOfBirth: '2002-05-06',
    nationality: 'England',
    preferredFoot: PreferredFoot.LEFT,
    heightCm: 189,
    primaryPosition: 'AM',
    imageUrl: 'https://example.com/palmer.png',
    currentTeam: {
      id: 'team-chelsea',
      name: 'Chelsea FC',
      shortName: 'Chelsea',
      logoUrl: null,
      country: 'England',
    },
  } as PlayerOrmEntity;

  beforeEach(() => {
    mockPlayerRepo = {
      findById: jest.fn(),
      search: jest.fn(),
      findTeamHistoryByPlayerId: jest.fn(),
      findSeasonStatisticsByPlayerId: jest.fn(),
      findMatchStatisticsByPlayerId: jest.fn(),
      findComparisonCandidates: jest.fn(),
    };

    useCase = new GetComparisonCandidatesUseCase(mockPlayerRepo);
  });

  it('should throw NotFoundException if current player does not exist', async () => {
    mockPlayerRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('invalid-id', {
        scope: ComparisonScope.COMPETITION,
        seasonId: 'season-1',
        competitionId: 'comp-1',
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockPlayerRepo.findById).toHaveBeenCalledWith('invalid-id');
  });

  it('should throw BadRequestException if scope is COMPETITION but competitionId is missing', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockCurrentPlayer);

    await expect(
      useCase.execute('saka-id', {
        scope: ComparisonScope.COMPETITION,
        seasonId: 'season-1',
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if minAge > maxAge', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockCurrentPlayer);

    await expect(
      useCase.execute('saka-id', {
        scope: ComparisonScope.ALL,
        seasonId: 'season-1',
        minAge: 25,
        maxAge: 20,
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if minHeightCm > maxHeightCm', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockCurrentPlayer);

    await expect(
      useCase.execute('saka-id', {
        scope: ComparisonScope.ALL,
        seasonId: 'season-1',
        minHeightCm: 190,
        maxHeightCm: 175,
        limit: 20,
        offset: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return candidates for COMPETITION scope with full mapped player info', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockCurrentPlayer);
    mockPlayerRepo.findComparisonCandidates.mockResolvedValue({
      items: [mockCandidatePlayer],
      total: 1,
    });

    const query = {
      scope: ComparisonScope.COMPETITION,
      seasonId: 'season-1',
      competitionId: 'comp-1',
      search: 'Palmer',
      position: 'AM',
      preferredFoot: PreferredFoot.LEFT,
      nationality: 'England',
      minAge: 20,
      maxAge: 25,
      minHeightCm: 180,
      maxHeightCm: 195,
      limit: 20,
      offset: 0,
    };

    const result = await useCase.execute('saka-id', query);

    expect(mockPlayerRepo.findComparisonCandidates).toHaveBeenCalledWith(
      'saka-id',
      query,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'palmer-id',
      fullName: 'Cole Palmer',
      imageUrl: 'https://example.com/palmer.png',
      dateOfBirth: '2002-05-06',
      nationality: 'England',
      preferredFoot: 'LEFT',
      heightCm: 189,
      primaryPosition: 'AM',
      currentTeam: {
        id: 'team-chelsea',
        name: 'Chelsea FC',
        shortName: 'Chelsea',
        logoUrl: null,
        country: 'England',
      },
    });
    expect(result.pagination).toEqual({
      limit: 20,
      offset: 0,
      total: 1,
    });
  });

  it('should return candidates for ALL scope without requiring competitionId', async () => {
    mockPlayerRepo.findById.mockResolvedValue(mockCurrentPlayer);
    mockPlayerRepo.findComparisonCandidates.mockResolvedValue({
      items: [mockCandidatePlayer],
      total: 1,
    });

    const query = {
      scope: ComparisonScope.ALL,
      seasonId: 'season-1',
      limit: 10,
      offset: 0,
    };

    const result = await useCase.execute('saka-id', query);

    expect(mockPlayerRepo.findComparisonCandidates).toHaveBeenCalledWith(
      'saka-id',
      query,
    );
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
