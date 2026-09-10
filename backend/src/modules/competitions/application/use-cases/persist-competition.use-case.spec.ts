import { BadRequestException } from '@nestjs/common';
import { PersistCompetitionUseCase } from './persist-competition.use-case';
import { CompetitionWriteRepository } from '../ports/competition-write.repository';
import { TransformedCompetition } from '../../../external-football/domain/models/transformed-competition.model';
import { CompetitionOrmEntity } from '../../infrastructure/persistence/typeorm/entities/competition.orm-entity';

describe('PersistCompetitionUseCase', () => {
  let useCase: PersistCompetitionUseCase;
  let mockCompetitionWriteRepository: jest.Mocked<CompetitionWriteRepository>;

  const validTransformedCompetition: TransformedCompetition = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2021',
    name: 'Premier League',
    code: 'PL',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    currentSeason: null,
    seasons: [],
  };

  const mockSavedEntity: CompetitionOrmEntity = {
    id: 'comp-uuid-1',
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2021',
    name: 'Premier League',
    country: 'England',
    type: 'LEAGUE',
    logoUrl: 'https://crests.football-data.org/PL.png',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-05-20T12:00:00Z'),
    seasons: [],
    matches: [],
    seasonStatistics: [],
  };

  beforeEach(() => {
    mockCompetitionWriteRepository = {
      findByExternalIdentity: jest.fn(),
      upsert: jest.fn().mockResolvedValue(mockSavedEntity),
    };

    useCase = new PersistCompetitionUseCase(mockCompetitionWriteRepository);
  });

  it('TC-01: should successfully persist valid transformed competition', async () => {
    const result = await useCase.execute(validTransformedCompetition);

    expect(result).toBeDefined();
    expect(result.id).toBe('comp-uuid-1');
    expect(result.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(result.externalId).toBe('2021');
    expect(mockCompetitionWriteRepository.upsert).toHaveBeenCalledTimes(1);
    expect(mockCompetitionWriteRepository.upsert).toHaveBeenCalledWith(
      validTransformedCompetition,
    );
  });

  it('TC-04: should reject when payload is missing or invalid', async () => {
    await expect(useCase.execute(null as any)).rejects.toThrow(
      BadRequestException,
    );

    await expect(
      useCase.execute({
        ...validTransformedCompetition,
        externalProvider: '',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute({
        ...validTransformedCompetition,
        externalId: '   ',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute({
        ...validTransformedCompetition,
        name: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-07: should propagate repository errors correctly', async () => {
    const dbError = new Error('Database connection failed');
    mockCompetitionWriteRepository.upsert.mockRejectedValue(dbError);

    await expect(useCase.execute(validTransformedCompetition)).rejects.toThrow(
      'Database connection failed',
    );
  });
});
