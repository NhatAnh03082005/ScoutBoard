import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExternalMatchMappingRepository,
  SaveExternalMatchMappingInput,
} from '../../../../application/ports/external-match-mapping.repository';
import { ExternalMatchMappingOrmEntity } from '../entities/external-match-mapping.orm-entity';

@Injectable()
export class TypeOrmExternalMatchMappingRepository
  implements ExternalMatchMappingRepository
{
  constructor(
    @InjectRepository(ExternalMatchMappingOrmEntity)
    private readonly repository: Repository<ExternalMatchMappingOrmEntity>,
  ) {}

  async findByProviderAndExternalId(
    externalProvider: string,
    externalId: string,
  ): Promise<ExternalMatchMappingOrmEntity | null> {
    return this.repository.findOne({
      where: {
        externalProvider,
        externalId: String(externalId).trim(),
      },
    });
  }

  async findByCanonicalMatchAndProvider(
    matchId: string,
    externalProvider: string,
  ): Promise<ExternalMatchMappingOrmEntity | null> {
    return this.repository.findOne({
      where: {
        matchId,
        externalProvider,
      },
    });
  }

  async create(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity> {
    const extId = String(input.externalId).trim();
    const entity = this.repository.create({
      matchId: input.matchId,
      externalProvider: input.externalProvider,
      externalId: extId,
      confidence: input.confidence ?? 1.0,
      status: input.status ?? 'CONFIRMED',
      metadata: input.metadata ?? null,
    });

    return this.repository.save(entity);
  }

  async upsert(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity> {
    const extId = String(input.externalId).trim();

    // 1. Check if this provider fixture is already mapped
    const existingByProvider = await this.findByProviderAndExternalId(
      input.externalProvider,
      extId,
    );

    // 2. Check if this canonical match is already mapped to this provider
    const existingByMatch = await this.findByCanonicalMatchAndProvider(
      input.matchId,
      input.externalProvider,
    );

    // Conflict Check A: Provider fixture points to a DIFFERENT match
    if (existingByProvider && existingByProvider.matchId !== input.matchId) {
      throw new ConflictException(
        `Conflicting match mapping: Provider fixture ${input.externalProvider}:${extId} is already mapped to Match ${existingByProvider.matchId}, cannot reassign to Match ${input.matchId}`,
      );
    }

    // Conflict Check B: Match is already mapped to a DIFFERENT provider fixture
    if (existingByMatch && existingByMatch.externalId !== extId) {
      throw new ConflictException(
        `Conflicting match mapping: Match ${input.matchId} is already mapped to provider fixture ${input.externalProvider}:${existingByMatch.externalId}, cannot reassign to fixture ${extId}`,
      );
    }

    // Idempotent Update if mapping exists
    const existing = existingByProvider || existingByMatch;
    if (existing) {
      existing.confidence = input.confidence ?? existing.confidence;
      existing.status = input.status ?? existing.status;
      existing.metadata = input.metadata ?? existing.metadata;
      return this.repository.save(existing);
    }

    // Otherwise create new mapping
    return this.create(input);
  }

  // Backward compatibility alias
  async findByProviderFixtureId(
    externalProvider: string,
    externalId: string,
  ): Promise<ExternalMatchMappingOrmEntity | null> {
    return this.findByProviderAndExternalId(externalProvider, externalId);
  }

  // Backward compatibility alias
  async findByMatchId(
    matchId: string,
    externalProvider: string,
  ): Promise<ExternalMatchMappingOrmEntity | null> {
    return this.findByCanonicalMatchAndProvider(matchId, externalProvider);
  }

  // Backward compatibility alias
  async saveMapping(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity> {
    return this.upsert(input);
  }
}
