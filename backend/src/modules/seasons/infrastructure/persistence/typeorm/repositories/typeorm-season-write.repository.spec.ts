import { Repository } from 'typeorm';
import { TypeOrmSeasonWriteRepository } from './typeorm-season-write.repository';
import { SeasonOrmEntity } from '../entities/season.orm-entity';
import { TransformedSeason } from 'src/modules/external-football/domain/models/transformed-competition.model';

describe('TypeOrmSeasonWriteRepository', () => {
  let repository: TypeOrmSeasonWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<SeasonOrmEntity>>;

  const mockCompetitionId = 'comp-uuid-123';
  const mockTransformedSeason: TransformedSeason = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '2502',
    seasonCode: '2026-2027',
    name: 'Premier League 2026/27',
    startDate: '2026-08-21',
    endDate: '2027-05-30',
    isCurrent: true,
    currentMatchday: 1,
  };

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmSeasonWriteRepository(mockOrmRepository);
  });

  // TC-01: Insert New Season
  it('TC-01: should insert new season when external identity does not exist', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const createdEntity: SeasonOrmEntity = {
      id: 'season-uuid-1',
      competitionId: mockCompetitionId,
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

    mockOrmRepository.create.mockReturnValue(createdEntity);
    mockOrmRepository.save.mockResolvedValue(createdEntity);

    const result = await repository.upsert(mockTransformedSeason, mockCompetitionId);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '2502',
      },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      competitionId: mockCompetitionId,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2502',
      seasonCode: '2026-2027',
      name: 'Premier League 2026/27',
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      isCurrent: true,
    });
    expect(mockOrmRepository.save).toHaveBeenCalledWith(createdEntity);
    expect(result).toBe(createdEntity);
  });

  // TC-02 & TC-03 & TC-08 & TC-09 & TC-11: Update Existing Season & Idempotency
  it('TC-02 & TC-03 & TC-08 & TC-09 & TC-11: should update existing season idempotently preserving id and createdAt', async () => {
    const existingCreatedAt = new Date('2023-01-01T00:00:00Z');
    const existingEntity: SeasonOrmEntity = {
      id: 'existing-season-1',
      competitionId: mockCompetitionId,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2502',
      seasonCode: '2026-2027',
      name: 'Old Season Name',
      startDate: '2026-08-01',
      endDate: '2027-05-01',
      isCurrent: false,
      dataUpdatedAt: null,
      createdAt: existingCreatedAt,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      competition: null as any,
      matches: [],
      seasonStatistics: [],
      seasonTeams: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(async (entity) => entity as SeasonOrmEntity);

    const updatedPayload: TransformedSeason = {
      ...mockTransformedSeason,
      name: 'Premier League 2026/27 Updated',
      startDate: '2026-08-21',
      endDate: '2027-05-30',
      isCurrent: true,
    };

    const result = await repository.upsert(updatedPayload, mockCompetitionId);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).toHaveBeenCalledWith(existingEntity);
    expect(result.id).toBe('existing-season-1');
    expect(result.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(result.externalId).toBe('2502');
    expect(result.name).toBe('Premier League 2026/27 Updated');
    expect(result.isCurrent).toBe(true);
    expect(result.createdAt).toBe(existingCreatedAt);
  });

  // TC-04: External Identity Differentiation
  it('TC-04: should query with exact external_provider and external_id pair', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    await repository.findByExternalIdentity('OTHER_PROVIDER', '2502');

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'OTHER_PROVIDER',
        externalId: '2502',
      },
    });
  });

  // TC-05: Nullable Dates
  it('TC-05: should handle null startDate and endDate gracefully', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation((e) => e as SeasonOrmEntity);
    mockOrmRepository.save.mockImplementation(async (e) => e as SeasonOrmEntity);

    const payloadWithNullDates: TransformedSeason = {
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '9999',
      seasonCode: '9999',
      name: 'Season Without Dates',
      startDate: null,
      endDate: null,
      isCurrent: false,
      currentMatchday: null,
    };

    const result = await repository.upsert(payloadWithNullDates, mockCompetitionId);

    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      competitionId: mockCompetitionId,
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '9999',
      seasonCode: '9999',
      name: 'Season Without Dates',
      startDate: null,
      endDate: null,
      isCurrent: false,
    });
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  // TC-12: upsertMany
  it('TC-12: should upsert array of seasons sequentially', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation((e) => e as SeasonOrmEntity);
    mockOrmRepository.save.mockImplementation(async (e) => e as SeasonOrmEntity);

    const results = await repository.upsertMany(
      [
        mockTransformedSeason,
        {
          ...mockTransformedSeason,
          externalId: '2403',
          seasonCode: '2025-2026',
          name: 'Premier League 2025/26',
        },
      ],
      mockCompetitionId,
    );

    expect(results).toHaveLength(2);
    expect(results[0].externalId).toBe('2502');
    expect(results[1].externalId).toBe('2403');
  });
});
