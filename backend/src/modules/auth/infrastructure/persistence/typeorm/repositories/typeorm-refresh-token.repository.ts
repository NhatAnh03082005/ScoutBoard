import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenRepository } from '../../../../domain/repositories/refresh-token.repository';
import { RefreshToken } from '../../../../domain/entities/refresh-token';
import { RefreshTokenOrmEntity } from '../entities/refresh-token.orm-entity';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';
import {
  TOKEN_SERVICE,
  TokenService,
} from '../../../../application/ports/token-service.port';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repository: Repository<RefreshTokenOrmEntity>,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async findByHashAndUserId(
    tokenHash: string,
    userId: string,
  ): Promise<RefreshToken | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash, userId },
    });

    return entity ? RefreshTokenMapper.toDomain(entity) : null;
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const entity = await this.repository.findOne({
      where: { tokenHash },
    });

    return entity ? RefreshTokenMapper.toDomain(entity) : null;
  }

  async save(refreshToken: RefreshToken): Promise<RefreshToken> {
    const entity = RefreshTokenMapper.toPersistence(refreshToken);
    const saved = await this.repository.save(entity);
    return RefreshTokenMapper.toDomain(saved);
  }

  async create(data: {
    userId: string;
    rawRefreshToken: string;
    tokenFamilyId?: string;
  }): Promise<RefreshToken> {
    const tokenHash = this.tokenService.hashToken(data.rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const entity = this.repository.create({
      userId: data.userId,
      tokenHash,
      tokenFamilyId: data.tokenFamilyId || null,
      expiresAt,
    });

    const saved = await this.repository.save(entity);
    return RefreshTokenMapper.toDomain(saved);
  }
}
