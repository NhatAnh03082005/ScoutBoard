import { ExternalMatchMappingOrmEntity } from '../../infrastructure/persistence/typeorm/entities/external-match-mapping.orm-entity';

export const EXTERNAL_MATCH_MAPPING_REPOSITORY = Symbol('EXTERNAL_MATCH_MAPPING_REPOSITORY');

export interface SaveExternalMatchMappingInput {
  matchId: string;
  externalProvider: string;
  externalId: string;
  confidence?: number;
  status?: string;
  metadata?: Record<string, any> | null;
}

export interface ExternalMatchMappingRepository {
  findByProviderAndExternalId(
    externalProvider: string,
    externalId: string,
  ): Promise<ExternalMatchMappingOrmEntity | null>;

  findByCanonicalMatchAndProvider(
    matchId: string,
    externalProvider: string,
  ): Promise<ExternalMatchMappingOrmEntity | null>;

  create(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity>;

  upsert(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity>;

  // Backward compatibility alias
  findByProviderFixtureId(
    externalProvider: string,
    externalId: string,
  ): Promise<ExternalMatchMappingOrmEntity | null>;

  // Backward compatibility alias
  findByMatchId(
    matchId: string,
    externalProvider: string,
  ): Promise<ExternalMatchMappingOrmEntity | null>;

  // Backward compatibility alias
  saveMapping(
    input: SaveExternalMatchMappingInput,
  ): Promise<ExternalMatchMappingOrmEntity>;
}
