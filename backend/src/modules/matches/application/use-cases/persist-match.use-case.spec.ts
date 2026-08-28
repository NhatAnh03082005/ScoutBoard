import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersistMatchUseCase } from './persist-match.use-case';
import {
  MatchWriteRepository,
  MatchResolvedReferences,
} from '../ports/match-write.repository';
import { CompetitionWriteRepository } from '../../../competitions/application/ports/competition-write.repository';
import { SeasonWriteRepository } from '../../../seasons/application/ports/season-write.repository';
import { TeamWriteRepository } from '../../../teams/application/ports/team-write.repository';
import { MatchOrmEntity } from '../../infrastructure/persistence/typeorm/entities/match.orm-entity';
import { TransformedMatch } from '../../../external-football/domain/models/transformed-match.model';

describe('PersistMatchUseCase', () => {
  let useCase: PersistMatchUseCase;
  let mockMatchWriteRepo: jest.Mocked<MatchWriteRepository>;
  let mockCompWriteRepo: jest.Mocked<CompetitionWriteRepository>;
  let mockSeasonWriteRepo: jest.Mocked<SeasonWriteRepository>;
  let mockTeamWriteRepo: jest.Mocked<TeamWriteRepository>;

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
    competitionExternalId: '2021',
    seasonExternalId: '2502',
    homeTeamExternalId: '66',
    awayTeamExternalId: '65',
  };

  const mockEntity: MatchOrmEntity = {
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

  beforeEach(() => {
    mockMatchWriteRepo = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockEntity),
      upsertMany: jest.fn().mockResolvedValue([mockEntity]),
    };

    mockCompWriteRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue({ id: 'comp-uuid-1' } as any),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    mockSeasonWriteRepo = {
      findByExternalIdentity: jest.fn().mockResolvedValue({ id: 'season-uuid-1' } as any),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
      findActiveSeason: jest.fn(),
    };

    mockTeamWriteRepo = {
      findByExternalIdentity: jest.fn().mockImplementation(async (_provider, extId) => {
        if (extId === '66') return { id: 'team-home-uuid' } as any;
        if (extId === '65') return { id: 'team-away-uuid' } as any;
        return null;
      }),
      upsert: jest.fn(),
      upsertMany: jest.fn(),
    };

    useCase = new PersistMatchUseCase(
      mockMatchWriteRepo,
      mockCompWriteRepo,
      mockSeasonWriteRepo,
      mockTeamWriteRepo,
    );
  });

  it('TC-01: should persist match with directly supplied references', async () => {
    const result = await useCase.execute(mockTransformedMatch, mockRefs);

    expect(mockMatchWriteRepo.upsert).toHaveBeenCalledWith(
      mockTransformedMatch,
      mockRefs,
    );
    expect(result).toBe(mockEntity);
  });

  it('TC-06, TC-07, TC-08, TC-09: should resolve all 4 FKs (comp, season, home team, away team) from external identities', async () => {
    const result = await useCase.execute(mockTransformedMatch, null);

    expect(mockCompWriteRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '2021',
    );
    expect(mockSeasonWriteRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '2502',
    );
    expect(mockTeamWriteRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '66',
    );
    expect(mockTeamWriteRepo.findByExternalIdentity).toHaveBeenCalledWith(
      'FOOTBALL_DATA_ORG',
      '65',
    );
    expect(mockMatchWriteRepo.upsert).toHaveBeenCalledWith(
      mockTransformedMatch,
      mockRefs,
    );
    expect(result).toBe(mockEntity);
  });

  it('TC-10: should throw NotFoundException when competition is not found', async () => {
    mockCompWriteRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(useCase.execute(mockTransformedMatch, null)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockMatchWriteRepo.upsert).not.toHaveBeenCalled();
  });

  it('TC-11: should throw NotFoundException when season is not found', async () => {
    mockSeasonWriteRepo.findByExternalIdentity.mockResolvedValue(null);

    await expect(useCase.execute(mockTransformedMatch, null)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockMatchWriteRepo.upsert).not.toHaveBeenCalled();
  });

  it('TC-12: should throw NotFoundException when home team is not found', async () => {
    mockTeamWriteRepo.findByExternalIdentity.mockResolvedValueOnce(null);

    await expect(useCase.execute(mockTransformedMatch, null)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockMatchWriteRepo.upsert).not.toHaveBeenCalled();
  });

  it('TC-13: should throw NotFoundException when away team is not found', async () => {
    mockTeamWriteRepo.findByExternalIdentity
      .mockResolvedValueOnce({ id: 'team-home-uuid' } as any) // home team found
      .mockResolvedValueOnce(null); // away team not found

    await expect(useCase.execute(mockTransformedMatch, null)).rejects.toThrow(
      NotFoundException,
    );
    expect(mockMatchWriteRepo.upsert).not.toHaveBeenCalled();
  });

  it('TC-14: should preserve null scores for scheduled match', async () => {
    const scheduledMatch: TransformedMatch = {
      ...mockTransformedMatch,
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
    };

    await useCase.execute(scheduledMatch, mockRefs);

    expect(mockMatchWriteRepo.upsert).toHaveBeenCalledWith(
      scheduledMatch,
      mockRefs,
    );
  });

  it('TC-22: should reject match when home team and away team are the same', async () => {
    const sameTeamRefs: MatchResolvedReferences = {
      ...mockRefs,
      awayTeamId: 'team-home-uuid',
    };

    await expect(
      useCase.execute(mockTransformedMatch, sameTeamRefs),
    ).rejects.toThrow(BadRequestException);
    expect(mockMatchWriteRepo.upsert).not.toHaveBeenCalled();
  });

  it('TC-23: should batch execute multiple matches with executeMany', async () => {
    const results = await useCase.executeMany([
      { match: mockTransformedMatch, refs: mockRefs },
      { match: { ...mockTransformedMatch, externalId: '327118' }, refs: mockRefs },
    ]);

    expect(results).toHaveLength(2);
    expect(mockMatchWriteRepo.upsert).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException when input is missing or empty', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      useCase.execute({ ...mockTransformedMatch, externalId: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
