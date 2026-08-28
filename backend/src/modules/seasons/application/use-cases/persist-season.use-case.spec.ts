import { BadRequestException } from '@nestjs/common';
import { PersistSeasonUseCase } from './persist-season.use-case';
import { SeasonWriteRepository } from '../ports/season-write.repository';
import { TransformedSeason } from '../../../external-football/domain/models/transformed-competition.model';
import { SeasonOrmEntity } from '../../infrastructure/persistence/typeorm/entities/season.orm-entity';

describe('PersistSeasonUseCase', () => {
  let useCase: PersistSeasonUseCase;
  let mockSeasonWriteRepository: jest.Mocked<SeasonWriteRepository>;

  const validCompetitionId = 'comp-uuid-123';
  const validTransformedSeason: TransformedSeason = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2502',
    seasonCode: '2026-2027',
    name: 'Premier League 2026/27',
    startDate: '2026-08-21',
    endDate: '2027-05-30',
    isCurrent: true,
    currentMatchday: 1,
  };

  const mockSavedEntity: SeasonOrmEntity = {
    id: 'season-uuid-1',
    competitionId: validCompetitionId,
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2502',
    seasonCode: '2026-2027',
    name: 'Premier League 2026/27',
    startDate: '2026-08-21',
    endDate: '2027-05-30',
    isCurrent: true,
    dataUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    competition: null as any,
    matches: [],
    seasonStatistics: [],
    seasonTeams: [],
  };

  beforeEach(() => {
    mockSeasonWriteRepository = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockSavedEntity),
      upsertMany: jest.fn().mockResolvedValue([mockSavedEntity]),
    };

    useCase = new PersistSeasonUseCase(mockSeasonWriteRepository);
  });

  it('TC-01: should successfully persist valid single transformed season', async () => {
    const result = await useCase.execute(validTransformedSeason, validCompetitionId);

    expect(result).toBeDefined();
    expect(result.id).toBe('season-uuid-1');
    expect(result.competitionId).toBe(validCompetitionId);
    expect(mockSeasonWriteRepository.upsert).toHaveBeenCalledWith(
      validTransformedSeason,
      validCompetitionId,
    );
  });

  it('TC-02: should successfully persist array of transformed seasons with executeMany', async () => {
    const result = await useCase.executeMany([validTransformedSeason], validCompetitionId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('season-uuid-1');
    expect(mockSeasonWriteRepository.upsertMany).toHaveBeenCalledWith(
      [validTransformedSeason],
      validCompetitionId,
    );
  });

  it('TC-07: should reject invalid or missing inputs', async () => {
    await expect(useCase.execute(null as any, validCompetitionId)).rejects.toThrow(
      BadRequestException,
    );

    await expect(useCase.execute(validTransformedSeason, '')).rejects.toThrow(
      BadRequestException,
    );

    await expect(
      useCase.execute(
        { ...validTransformedSeason, externalProvider: '' },
        validCompetitionId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute(
        { ...validTransformedSeason, externalId: '  ' },
        validCompetitionId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute(
        { ...validTransformedSeason, name: '' },
        validCompetitionId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.executeMany(null as any, validCompetitionId),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.executeMany([validTransformedSeason], ''),
    ).rejects.toThrow(BadRequestException);
  });
});
