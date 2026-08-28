import { Repository } from 'typeorm';
import { TypeOrmPlayerWriteRepository } from './typeorm-player-write.repository';
import { PlayerOrmEntity } from '../entities/player.orm-entity';
import { TransformedPlayer } from '../../../../external-football/domain/models/transformed-player.model';

describe('TypeOrmPlayerWriteRepository', () => {
  let repository: TypeOrmPlayerWriteRepository;
  let mockOrmRepository: jest.Mocked<Repository<PlayerOrmEntity>>;

  const mockTeamId = 'team-uuid-123';
  const mockTransformedPlayer: TransformedPlayer = {
    externalProvider: 'FOOTBALL_DATA_ORG',
    externalId: '44',
    name: 'Cristiano Ronaldo',
    normalizedName: 'cristiano ronaldo',
    shortName: 'Ronaldo',
    dateOfBirth: '1985-02-05',
    nationality: 'Portugal',
    heightCm: 187,
    weightKg: 83,
    preferredFoot: 'Right',
    primaryPosition: 'Centre-Forward',
    shirtNumber: 7,
    imageUrl: null,
    status: 'ACTIVE',
    dataUpdatedAt: new Date('2024-05-20T12:00:00Z'),
  };

  beforeEach(() => {
    mockOrmRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    repository = new TypeOrmPlayerWriteRepository(mockOrmRepository);
  });

  it('should insert new player and attach currentTeamId', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);

    const createdEntity: PlayerOrmEntity = {
      id: 'player-uuid-1',
      currentTeamId: mockTeamId,
      ...mockTransformedPlayer,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentTeam: null,
      positions: [],
      teamHistory: [],
      matchStatistics: [],
      seasonStatistics: [],
    };

    mockOrmRepository.create.mockReturnValue(createdEntity);
    mockOrmRepository.save.mockResolvedValue(createdEntity);

    const result = await repository.upsert(mockTransformedPlayer, mockTeamId);

    expect(mockOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '44',
      },
    });
    expect(mockOrmRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTeamId: mockTeamId,
        externalProvider: 'FOOTBALL_DATA_ORG',
        externalId: '44',
        name: 'Cristiano Ronaldo',
        primaryPosition: 'Centre-Forward',
      }),
    );
    expect(result).toBe(createdEntity);
  });

  it('should update existing player and preserve id and createdAt', async () => {
    const existingCreatedAt = new Date('2023-01-01T00:00:00Z');
    const existingEntity: PlayerOrmEntity = {
      id: 'existing-player-uuid',
      currentTeamId: 'old-team-uuid',
      externalProvider: 'FOOTBALL_DATA_ORG',
      externalId: '44',
      name: 'Old Name',
      normalizedName: 'old name',
      shortName: 'Old',
      dateOfBirth: '1985-02-05',
      nationality: 'Portugal',
      heightCm: 187,
      weightKg: 83,
      preferredFoot: 'Right',
      primaryPosition: 'Forward',
      shirtNumber: 9,
      imageUrl: null,
      status: 'ACTIVE',
      dataUpdatedAt: null,
      createdAt: existingCreatedAt,
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      currentTeam: null,
      positions: [],
      teamHistory: [],
      matchStatistics: [],
      seasonStatistics: [],
    };

    mockOrmRepository.findOne.mockResolvedValue(existingEntity);
    mockOrmRepository.save.mockImplementation(async (entity) => entity as PlayerOrmEntity);

    const result = await repository.upsert(mockTransformedPlayer, mockTeamId);

    expect(mockOrmRepository.create).not.toHaveBeenCalled();
    expect(mockOrmRepository.save).toHaveBeenCalledWith(existingEntity);
    expect(result.id).toBe('existing-player-uuid');
    expect(result.name).toBe('Cristiano Ronaldo');
    expect(result.shirtNumber).toBe(7);
    expect(result.currentTeamId).toBe(mockTeamId);
    expect(result.createdAt).toBe(existingCreatedAt);
  });

  it('should upsert array of players sequentially', async () => {
    mockOrmRepository.findOne.mockResolvedValue(null);
    mockOrmRepository.create.mockImplementation((e) => e as PlayerOrmEntity);
    mockOrmRepository.save.mockImplementation(async (e) => e as PlayerOrmEntity);

    const results = await repository.upsertMany(
      [
        mockTransformedPlayer,
        { ...mockTransformedPlayer, externalId: '45', name: 'Bruno Fernandes' },
      ],
      mockTeamId,
    );

    expect(results).toHaveLength(2);
    expect(results[0].externalId).toBe('44');
    expect(results[1].externalId).toBe('45');
  });
});
