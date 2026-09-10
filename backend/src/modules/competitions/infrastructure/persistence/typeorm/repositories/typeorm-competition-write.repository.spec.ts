import { Repository } from 'typeorm';
import { TypeOrmCompetitionWriteRepository } from './typeorm-competition-write.repository';
import { CompetitionOrmEntity } from '../entities/competition.orm-entity';
import { TransformedCompetition } from '../../../../../external-football/domain/models/transformed-competition.model';

describe('TypeOrmCompetitionWriteRepository', () => {
  let repository: TypeOrmCompetitionWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<CompetitionOrmEntity>>;

  const mockTransformedCompetition: TransformedCompetition = {
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

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmCompetitionWriteRepository(mockOrmRepository);
  });

  // TC-01: Insert New Competition
  it('TC-01: should insert new competition when external identity does not exist', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const createdEntity: CompetitionOrmEntity = {
      id: 'uuid-1',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2021',
      name: 'Premier League',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: 'https://crests.football-data.org/PL.png',
      dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      seasons: [],
      matches: [],
      seasonStatistics: [],
    };

    mockOrmRepository.create.mockReturnValue(createdEntity);
    mockOrmRepository.save.mockResolvedValue(createdEntity);

    const result = await repository.upsert(mockTransformedCompetition);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '2021',
      },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2021',
      name: 'Premier League',
      country: 'England',
      type: 'LEAGUE',
      logoUrl: 'https://crests.football-data.org/PL.png',
      dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    });
    expect(mockOrmRepository.save).toHaveBeenCalledWith(createdEntity);
    expect(result).toBe(createdEntity);
  });

  // TC-02, TC-03, TC-08, TC-09: Update Existing Competition & Idempotency
  it('TC-02 & TC-03 & TC-08 & TC-09: should update existing competition idempotently preserving id and createdAt', async () => {
    const existingCreatedAt = new Date('2023-01-01T00:00:00Z');
    const existingEntity: CompetitionOrmEntity = {
      id: 'existing-uuid-1',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '2021',
      name: 'Old Name',
      country: 'Old Country',
      type: 'LEAGUE',
      logoUrl: 'https://old-logo.png',
      dataUpdatedAt: new Date('2023-01-01T00:00:00Z'),
      createdAt: existingCreatedAt,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      seasons: [],
      matches: [],
      seasonStatistics: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(
      async (entity) => entity as CompetitionOrmEntity,
    );

    const updatedPayload: TransformedCompetition = {
      ...mockTransformedCompetition,
      name: 'Premier League Updated',
      logoUrl: 'https://new-logo.png',
    };

    const result = await repository.upsert(updatedPayload);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).toHaveBeenCalledWith(existingEntity);
    expect(result.id).toBe('existing-uuid-1');
    expect(result.externalProvider).toBe('FOOTBALL_DATA_ORG');
    expect(result.externalId).toBe('2021');
    expect(result.name).toBe('Premier League Updated');
    expect(result.logoUrl).toBe('https://new-logo.png');
    expect(result.createdAt).toBe(existingCreatedAt);
  });

  // TC-04: External Identity Differentiation
  it('TC-04: should query with exact external_provider and external_id pair', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation(
      (e) => e as CompetitionOrmEntity,
    );
    mockOrmRepository.save.mockImplementation(
      async (e) => e as CompetitionOrmEntity,
    );

    await repository.findByExternalIdentity('OTHER_PROVIDER', '2021');

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'OTHER_PROVIDER',
        externalId: '2021',
      },
    });
  });

  // TC-06: Nullable Fields
  it('TC-06: should handle null optional fields gracefully', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation(
      (e) => e as CompetitionOrmEntity,
    );
    mockOrmRepository.save.mockImplementation(
      async (e) => e as CompetitionOrmEntity,
    );

    const payloadWithNulls: TransformedCompetition = {
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '9999',
      name: 'Cup Without Country',
      code: null,
      country: null,
      type: null,
      logoUrl: null,
      dataUpdatedAt: null,
      currentSeason: null,
      seasons: [],
    };

    const result = await repository.upsert(payloadWithNulls);

    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '9999',
      name: 'Cup Without Country',
      country: null,
      type: null,
      logoUrl: null,
      dataUpdatedAt: null,
    });
    expect(result.country).toBeNull();
    expect(result.logoUrl).toBeNull();
  });
});
