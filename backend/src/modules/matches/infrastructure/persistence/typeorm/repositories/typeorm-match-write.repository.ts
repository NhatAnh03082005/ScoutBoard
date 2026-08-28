import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchOrmEntity } from '../entities/match.orm-entity';
import {
  MatchWriteRepository,
  MatchResolvedReferences,
} from '../../../../application/ports/match-write.repository';
import { TransformedMatch } from '../../../../../external-football/domain/models/transformed-match.model';

@Injectable()
export class TypeOrmMatchWriteRepository implements MatchWriteRepository {
  constructor(
    @InjectRepository(MatchOrmEntity)
    private readonly repository: Repository<MatchOrmEntity>,
  ) {}

  async findByExternalIdentity(
    externalProvider: string,
    externalId: string,
  ): Promise<MatchOrmEntity | null> {
    return this.repository.findOne({
      where: {
        externalProvider: externalProvider.trim(),
        externalId: externalId.trim(),
      },
    });
  }

  async upsert(
    match: TransformedMatch,
    refs: MatchResolvedReferences,
  ): Promise<MatchOrmEntity> {
    const provider = match.externalProvider.trim();
    const extId = match.externalId.trim();

    const existing = await this.findByExternalIdentity(provider, extId);

    if (!existing) {
      const entity = this.repository.create({
        externalProvider: provider,
        externalId: extId,
        competitionId: refs.competitionId,
        seasonId: refs.seasonId,
        homeTeamId: refs.homeTeamId,
        awayTeamId: refs.awayTeamId,
        matchDate: match.matchDate,
        status: match.status || 'SCHEDULED',
        homeScore: match.homeScore !== undefined ? match.homeScore : null,
        awayScore: match.awayScore !== undefined ? match.awayScore : null,
        dataUpdatedAt: match.dataUpdatedAt || null,
      });

      return this.repository.save(entity);
    }

    // In-place update for live match state progression
    existing.competitionId = refs.competitionId;
    existing.seasonId = refs.seasonId;
    existing.homeTeamId = refs.homeTeamId;
    existing.awayTeamId = refs.awayTeamId;
    existing.matchDate = match.matchDate;
    if (match.status) {
      existing.status = match.status;
    }
    existing.homeScore = match.homeScore !== undefined ? match.homeScore : null;
    existing.awayScore = match.awayScore !== undefined ? match.awayScore : null;
    if (match.dataUpdatedAt) {
      existing.dataUpdatedAt = match.dataUpdatedAt;
    }

    return this.repository.save(existing);
  }

  async upsertMany(
    items: Array<{ match: TransformedMatch; refs: MatchResolvedReferences }>,
  ): Promise<MatchOrmEntity[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Deduplicate items by external identity (externalProvider:externalId)
    const map = new Map<
      string,
      { match: TransformedMatch; refs: MatchResolvedReferences }
    >();
    for (const item of items) {
      if (!item || !item.match || !item.match.externalProvider || !item.match.externalId) {
        continue;
      }
      const key = `${item.match.externalProvider.trim()}:${item.match.externalId.trim()}`;
      map.set(key, item);
    }

    const results: MatchOrmEntity[] = [];
    for (const item of map.values()) {
      const persisted = await this.upsert(item.match, item.refs);
      results.push(persisted);
    }
    return results;
  }
}
