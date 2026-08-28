import { ConflictException } from '@nestjs/common';
import { TypeOrmExternalMatchMappingRepository } from './typeorm-external-match-mapping.repository';
import { ExternalMatchMappingOrmEntity } from '../entities/external-match-mapping.orm-entity';

describe('TypeOrmExternalMatchMappingRepository', () => {
  let repository: TypeOrmExternalMatchMappingRepository;
  let mockTypeOrmRepo: any;

  beforeEach(() => {
    mockTypeOrmRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'mapping-uuid-1', createdAt: new Date(), updatedAt: new Date() })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'mapping-uuid-1' })),
    };

    repository = new TypeOrmExternalMatchMappingRepository(mockTypeOrmRepo);
  });

  it('should find mapping by provider and external fixture ID', async () => {
    const mockMapping = {
      id: 'mapping-1',
      matchId: 'match-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
    } as ExternalMatchMappingOrmEntity;

    mockTypeOrmRepo.findOne.mockResolvedValueOnce(mockMapping);

    const result = await repository.findByProviderAndExternalId('SPORTMONKS', '18535518');

    expect(result).toEqual(mockMapping);
    expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
      where: { externalProvider: 'SPORTMONKS', externalId: '18535518' },
    });
  });

  it('should find mapping by canonical match and provider', async () => {
    const mockMapping = {
      id: 'mapping-1',
      matchId: 'match-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
    } as ExternalMatchMappingOrmEntity;

    mockTypeOrmRepo.findOne.mockResolvedValueOnce(mockMapping);

    const result = await repository.findByCanonicalMatchAndProvider('match-1', 'SPORTMONKS');

    expect(result).toEqual(mockMapping);
    expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
      where: { matchId: 'match-1', externalProvider: 'SPORTMONKS' },
    });
  });

  it('should create and save a new mapping', async () => {
    const result = await repository.create({
      matchId: 'match-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
      confidence: 1.0,
      status: 'CONFIRMED',
      metadata: { notes: 'verified' },
    });

    expect(result.matchId).toBe('match-uuid-1');
    expect(mockTypeOrmRepo.create).toHaveBeenCalled();
    expect(mockTypeOrmRepo.save).toHaveBeenCalled();
  });

  it('should idempotently update existing mapping when match and fixture match', async () => {
    const existing = {
      id: 'mapping-1',
      matchId: 'match-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
      confidence: 0.9,
      status: 'CONFIRMED',
      metadata: null,
    } as ExternalMatchMappingOrmEntity;

    mockTypeOrmRepo.findOne
      .mockResolvedValueOnce(existing) // findByProviderAndExternalId
      .mockResolvedValueOnce(existing); // findByCanonicalMatchAndProvider

    const result = await repository.upsert({
      matchId: 'match-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
      confidence: 1.0,
    });

    expect(result.confidence).toBe(1.0);
    expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mapping-1', confidence: 1.0 }),
    );
  });

  it('should reject conflicting mapping when provider fixture is already mapped to another Match', async () => {
    const existingForDifferentMatch = {
      id: 'mapping-1',
      matchId: 'match-ANOTHER-uuid',
      externalProvider: 'SPORTMONKS',
      externalId: '18535518',
    } as ExternalMatchMappingOrmEntity;

    mockTypeOrmRepo.findOne
      .mockResolvedValueOnce(existingForDifferentMatch) // findByProviderAndExternalId
      .mockResolvedValueOnce(null); // findByCanonicalMatchAndProvider

    await expect(
      repository.upsert({
        matchId: 'match-NEW-uuid',
        externalProvider: 'SPORTMONKS',
        externalId: '18535518',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject conflicting mapping when canonical match is already mapped to another provider fixture', async () => {
    const existingWithDifferentFixture = {
      id: 'mapping-1',
      matchId: 'match-uuid-1',
      externalProvider: 'SPORTMONKS',
      externalId: '99999999', // Different fixture ID
    } as ExternalMatchMappingOrmEntity;

    mockTypeOrmRepo.findOne
      .mockResolvedValueOnce(null) // findByProviderAndExternalId
      .mockResolvedValueOnce(existingWithDifferentFixture); // findByCanonicalMatchAndProvider

    await expect(
      repository.upsert({
        matchId: 'match-uuid-1',
        externalProvider: 'SPORTMONKS',
        externalId: '18535518',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
