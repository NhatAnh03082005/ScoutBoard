import { RefreshToken } from '../../../../domain/entities/refresh-token';
import { RefreshTokenOrmEntity } from '../entities/refresh-token.orm-entity';

export class RefreshTokenMapper {
  static toDomain(entity: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken(
      entity.id,
      entity.userId,
      entity.tokenHash,
      entity.tokenFamilyId,
      entity.expiresAt,
      entity.lastUsedAt,
      entity.revokedAt,
      entity.createdAt,
    );
  }

  static toPersistence(domain: RefreshToken): RefreshTokenOrmEntity {
    const entity = new RefreshTokenOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.tokenHash = domain.tokenHash;
    entity.tokenFamilyId = domain.tokenFamilyId;
    entity.expiresAt = domain.expiresAt;
    entity.lastUsedAt = domain.lastUsedAt;
    entity.revokedAt = domain.revokedAt;
    return entity;
  }
}
