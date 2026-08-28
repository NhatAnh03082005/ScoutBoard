import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamOrmEntity } from '../entities/team.orm-entity';
import { TeamWriteRepository } from '../../../../application/ports/team-write.repository';
import { TransformedTeam } from '../../../../../external-football/domain/models/transformed-team.model';

@Injectable()
export class TypeOrmTeamWriteRepository implements TeamWriteRepository {
  constructor(
    @InjectRepository(TeamOrmEntity)
    private readonly repository: Repository<TeamOrmEntity>,
  ) {}

  async findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<TeamOrmEntity | null> {
    return this.repository.findOne({
      where: {
        externalProvider: externalProvider.trim(),
        externalId: externalId.trim(),
      },
    });
  }

  async upsert(team: TransformedTeam): Promise<TeamOrmEntity> {
    const existing = await this.findByExternalIdentity(
      team.externalProvider,
      team.externalId,
    );

    if (!existing) {
      const entity = this.repository.create({
        externalProvider: team.externalProvider.trim(),
        externalId: team.externalId.trim(),
        name: team.name.trim(),
        shortName: team.shortName ? team.shortName.trim() : null,
        tla: team.tla ? team.tla.trim().toUpperCase() : null,
        country: team.country ? team.country.trim() : null,
        foundedYear: team.foundedYear ?? null,
        venueName: team.venueName ? team.venueName.trim() : null,
        logoUrl: team.logoUrl ? team.logoUrl.trim() : null,
        status: team.status || 'ACTIVE',
        dataUpdatedAt: team.dataUpdatedAt || null,
      });

      return this.repository.save(entity);
    }

    existing.name = team.name.trim();
    existing.shortName = team.shortName ? team.shortName.trim() : null;
    existing.tla = team.tla ? team.tla.trim().toUpperCase() : null;
    if (team.country) {
      existing.country = team.country.trim();
    }
    if (team.foundedYear !== undefined && team.foundedYear !== null) {
      existing.foundedYear = team.foundedYear;
    }
    if (team.venueName) {
      existing.venueName = team.venueName.trim();
    }
    if (team.logoUrl) {
      existing.logoUrl = team.logoUrl.trim();
    }
    if (team.status) {
      existing.status = team.status;
    }
    if (team.dataUpdatedAt) {
      existing.dataUpdatedAt = team.dataUpdatedAt;
    }

    return this.repository.save(existing);
  }

  async upsertMany(teams: TransformedTeam[]): Promise<TeamOrmEntity[]> {
    const results: TeamOrmEntity[] = [];
    for (const team of teams) {
      const persisted = await this.upsert(team);
      results.push(persisted);
    }
    return results;
  }
}
