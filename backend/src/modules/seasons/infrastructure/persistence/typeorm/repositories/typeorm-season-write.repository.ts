import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonWriteRepository } from 'src/modules/seasons/application/ports/season-write.repository';
import { SeasonOrmEntity } from '../entities/season.orm-entity';
import { TransformedSeason } from 'src/modules/external-football/domain/models/transformed-competition.model';

@Injectable()
export class TypeOrmSeasonWriteRepository implements SeasonWriteRepository {
  constructor(
    @InjectRepository(SeasonOrmEntity)
    private readonly repository: Repository<SeasonOrmEntity>,
  ) {}

  async findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<SeasonOrmEntity | null> {
    return this.repository.findOne({
      where: {
        externalProvider: externalProvider.trim(),
        externalId: externalId.trim(),
      },
    });
  }

  async upsert(
    season: TransformedSeason,
    competitionId: string,
  ): Promise<SeasonOrmEntity> {
    const existing = await this.findByExternalIdentity(
      season.externalProvider,
      season.externalId,
    );

    if (!existing) {
      const entity = this.repository.create({
        competitionId: competitionId.trim(),
        externalProvider: season.externalProvider.trim(),
        externalId: season.externalId.trim(),
        seasonCode: season.seasonCode ? season.seasonCode.trim() : null,
        name: season.name.trim(),
        startDate: season.startDate || null,
        endDate: season.endDate || null,
        isCurrent: Boolean(season.isCurrent),
      });

      return this.repository.save(entity);
    }

    existing.competitionId = competitionId.trim();
    existing.seasonCode = season.seasonCode ? season.seasonCode.trim() : null;
    existing.name = season.name.trim();
    existing.startDate = season.startDate || null;
    existing.endDate = season.endDate || null;
    existing.isCurrent = Boolean(season.isCurrent);

    return this.repository.save(existing);
  }

  async upsertMany(
    seasons: TransformedSeason[],
    competitionId: string,
  ): Promise<SeasonOrmEntity[]> {
    if (!seasons || !Array.isArray(seasons) || seasons.length === 0) {
      return [];
    }

    const savedEntities: SeasonOrmEntity[] = [];
    for (const season of seasons) {
      if (season && season.externalId) {
        const saved = await this.upsert(season, competitionId);
        savedEntities.push(saved);
      }
    }

    return savedEntities;
  }
}
