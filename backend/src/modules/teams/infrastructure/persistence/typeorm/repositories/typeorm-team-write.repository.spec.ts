import { Repository } from 'typeorm';
import { TypeOrmTeamWriteRepository } from './typeorm-team-write.repository';
import { TeamOrmEntity } from '../entities/team.orm-entity';
import { TransformedTeam } from '../../../../external-football/domain/models/transformed-team.model';

describe('TypeOrmTeamWriteRepository', () => {
  let repository: TypeOrmTeamWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<TeamOrmEntity>>;

  const mockTransformedTeam: TransformedTeam = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '66',
    name: 'Manchester United FC',
    shortName: 'Man United',
    tla: 'MUN',
    country: 'England',
    foundedYear: 1878,
    venueName: 'Old Trafford',
    logoUrl: 'https://crests.football-data.org/66.png',
    status: 'ACTIVE',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
    squad: [],
  };

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmTeamWriteRepository(mockOrmRepository);
  });

  it('should insert new team when not found in database', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const createdEntity: TeamOrmEntity = {
      id: 'team-uuid-1',
      ...mockTransformedTeam,
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

    mockOrmRepository.create.mockReturnValue(createdEntity);
    mockOrmRepository.save.mockResolvedValue(createdEntity);

    const result = await repository.upsert(mockTransformedTeam);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '66',
      },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith({
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '66',
      name: 'Manchester United FC',
      shortName: 'Man United',
      tla: 'MUN',
      country: 'England',
      foundedYear: 1878,
      venueName: 'Old Trafford',
      logoUrl: 'https://crests.football-data.org/66.png',
      status: 'ACTIVE',
      dataUpdatedAt: mockTransformedTeam.dataUpdatedAt,
    });
    expect(result).toBe(createdEntity);
  });

  it('should update existing team and preserve id and createdAt', async () => {
    const existingCreatedAt = new Date('2023-01-01T00:00:00Z');
    const existingEntity: TeamOrmEntity = {
      id: 'existing-team-uuid',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '66',
      name: 'Old Team Name',
      shortName: 'Old Short',
      tla: 'OLD',
      country: 'England',
      foundedYear: 1878,
      venueName: 'Old Ground',
      logoUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      createdAt: existingCreatedAt,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      players: [],
      teamHistory: [],
      homeMatches: [],
      awayMatches: [],
      matchStatistics: [],
      seasonStatistics: [],
      seasonTeams: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(
      async (entity) => entity as TeamOrmEntity,
    );

    const result = await repository.upsert(mockTransformedTeam);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).toHaveBeenCalledWith(existingEntity);
    expect(result.id).toBe('existing-team-uuid');
    expect(result.name).toBe('Manchester United FC');
    expect(result.tla).toBe('MUN');
    expect(result.createdAt).toBe(existingCreatedAt);
  });

  it('should upsert array of teams sequentially', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation((e) => e as TeamOrmEntity);
    mockOrmRepository.save.mockImplementation(async (e) => e as TeamOrmEntity);

    const results = await repository.upsertMany([
      mockTransformedTeam,
      { ...mockTransformedTeam, externalId: '65', name: 'Man City' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].externalId).toBe('66');
    expect(results[1].externalId).toBe('65');
  });
});
