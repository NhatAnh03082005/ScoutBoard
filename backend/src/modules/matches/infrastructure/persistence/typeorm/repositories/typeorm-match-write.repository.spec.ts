import { Repository } from 'typeorm';
import { TypeOrmMatchWriteRepository } from './typeorm-match-write.repository';
import { MatchOrmEntity } from '../entities/match.orm-entity';
import { TransformedMatch } from '../../../../external-football/domain/models/transformed-match.model';
import { MatchResolvedReferences } from '../../../../application/ports/match-write.repository';

describe('TypeOrmMatchWriteRepository', () => {
  let repository: TypeOrmMatchWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<MatchOrmEntity>>;

  const mockRefs: MatchResolvedReferences = {
    competitionId: 'comp-uuid-1',
    seasonId: 'season-uuid-1',
    homeTeamId: 'team-home-uuid',
    awayTeamId: 'team-away-uuid',
  };

  const mockTransformedMatch: TransformedMatch = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '327117',
    matchDate: new Date('2026-08-22T19:00:00Z'),
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 1,
    dataUpdatedAt: new Date('2026-08-22T21:00:00Z'),
    homeTeamExternalId: '66',
    awayTeamExternalId: '65',
  };

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmMatchWriteRepository(mockOrmRepository);
  });

  it('TC-01 & TC-18: should insert new match when not found in database', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const createdEntity: MatchOrmEntity = {
      id: 'match-uuid-1',
      competitionId: mockRefs.competitionId,
      seasonId: mockRefs.seasonId,
      homeTeamId: mockRefs.homeTeamId,
      awayTeamId: mockRefs.awayTeamId,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '327117',
      matchDate: mockTransformedMatch.matchDate,
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
      dataUpdatedAt: mockTransformedMatch.dataUpdatedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      competition: null as any,
      season: null as any,
      homeTeam: null as any,
      awayTeam: null as any,
      matchStatistics: [],
    };

    mockOrmRepository.create.mockReturnValue(createdEntity);
    mockOrmRepository.save.mockResolvedValue(createdEntity);

    const result = await repository.upsert(mockTransformedMatch, mockRefs);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '327117',
      },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '327117',
      competitionId: mockRefs.competitionId,
      seasonId: mockRefs.seasonId,
      homeTeamId: mockRefs.homeTeamId,
      awayTeamId: mockRefs.awayTeamId,
      matchDate: mockTransformedMatch.matchDate,
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
      dataUpdatedAt: mockTransformedMatch.dataUpdatedAt,
    });
    expect(result).toBe(createdEntity);
  });

  it('TC-02 & TC-03 & TC-19 & TC-20: should update existing match and preserve id and createdAt', async () => {
    const existingCreatedAt = new Date('2023-01-01T00:00:00Z');
    const existingEntity: MatchOrmEntity = {
      id: 'existing-match-uuid',
      competitionId: 'old-comp-uuid',
      seasonId: 'old-season-uuid',
      homeTeamId: 'old-home-uuid',
      awayTeamId: 'old-away-uuid',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '327117',
      matchDate: new Date('2026-08-22T15:00:00Z'),
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: null,
      createdAt: existingCreatedAt,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      competition: null as any,
      season: null as any,
      homeTeam: null as any,
      awayTeam: null as any,
      matchStatistics: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(
      async (entity) => entity as MatchOrmEntity,
    );

    const result = await repository.upsert(mockTransformedMatch, mockRefs);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).toHaveBeenCalledWith(existingEntity);
    expect(result.id).toBe('existing-match-uuid');
    expect(result.status).toBe('FINISHED');
    expect(result.homeScore).toBe(2);
    expect(result.awayScore).toBe(1);
    expect(result.competitionId).toBe(mockRefs.competitionId);
    expect(result.createdAt).toBe(existingCreatedAt);
  });

  it('TC-04 & TC-05: should handle live match state updates from SCHEDULED -> IN_PLAY -> FINISHED with scores', async () => {
    const existingEntity: MatchOrmEntity = {
      id: 'match-live-uuid',
      competitionId: mockRefs.competitionId,
      seasonId: mockRefs.seasonId,
      homeTeamId: mockRefs.homeTeamId,
      awayTeamId: mockRefs.awayTeamId,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '327117',
      matchDate: new Date('2026-08-22T19:00:00Z'),
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      dataUpdatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      competition: null as any,
      season: null as any,
      homeTeam: null as any,
      awayTeam: null as any,
      matchStatistics: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(
      async (entity) => entity as MatchOrmEntity,
    );

    // Live update 1: IN_PLAY 1-0
    const inPlayMatch: TransformedMatch = {
      ...mockTransformedMatch,
      status: 'IN_PLAY',
      homeScore: 1,
      awayScore: 0,
    };
    const res1 = await repository.upsert(inPlayMatch, mockRefs);
    expect(res1.status).toBe('IN_PLAY');
    expect(res1.homeScore).toBe(1);
    expect(res1.awayScore).toBe(0);

    // Live update 2: FINISHED 2-1
    const finishedMatch: TransformedMatch = {
      ...mockTransformedMatch,
      status: 'FINISHED',
      homeScore: 2,
      awayScore: 1,
    };
    const res2 = await repository.upsert(finishedMatch, mockRefs);
    expect(res2.status).toBe('FINISHED');
    expect(res2.homeScore).toBe(2);
    expect(res2.awayScore).toBe(1);
  });

  it('TC-23 & TC-24: should batch upsert matches and deduplicate input items', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation((e) => e as MatchOrmEntity);
    mockOrmRepository.save.mockImplementation(async (e) => e as MatchOrmEntity);

    const results = await repository.upsertMany([
      { match: mockTransformedMatch, refs: mockRefs },
      { match: mockTransformedMatch, refs: mockRefs }, // duplicate in input
      {
        match: { ...mockTransformedMatch, externalId: '327118' },
        refs: mockRefs,
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].externalId).toBe('327117');
    expect(results[1].externalId).toBe('327118');
  });
});
