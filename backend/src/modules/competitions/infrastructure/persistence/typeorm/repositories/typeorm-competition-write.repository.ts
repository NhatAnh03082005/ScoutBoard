import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionWriteRepository } from 'src/modules/competitions/application/ports/competition-write.repository';
import { CompetitionOrmEntity } from '../entities/competition.orm-entity';
import { TransformedCompetition } from 'src/modules/external-football/domain/models/transformed-competition.model';

@Injectable()
export class TypeOrmCompetitionWriteRepository implements CompetitionWriteRepository {
  constructor(
    @InjectRepository(CompetitionOrmEntity)
    private readonly repository: Repository<CompetitionOrmEntity>,
  ) {}

  async findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<CompetitionOrmEntity | null> {
    return this.repository.findOne({
      where: {
        externalProvider: externalProvider.trim(),
        externalId: externalId.trim(),
      },
    });
  }

  async upsert(
    competition: TransformedCompetition,
  ): Promise<CompetitionOrmEntity> {
    const existing = await this.findByExternalIdentity(
      competition.externalProvider,
      competition.externalId,
    );

    if (!existing) {
      const entity = this.repository.create({
        externalProvider: competition.externalProvider.trim(),
        externalId: competition.externalId.trim(),
        name: competition.name.trim(),
        country: competition.country ? competition.country.trim() : null,
        type: competition.type ? competition.type.trim() : null,
        logoUrl: competition.logoUrl ? competition.logoUrl.trim() : null,
        dataUpdatedAt: competition.dataUpdatedAt || null,
      });

      return this.repository.save(entity);
    }

    existing.name = competition.name.trim();
    existing.country = competition.country ? competition.country.trim() : null;
    existing.type = competition.type ? competition.type.trim() : null;
    existing.logoUrl = competition.logoUrl ? competition.logoUrl.trim() : null;
    existing.dataUpdatedAt = competition.dataUpdatedAt || null;

    return this.repository.save(existing);
  }
}
