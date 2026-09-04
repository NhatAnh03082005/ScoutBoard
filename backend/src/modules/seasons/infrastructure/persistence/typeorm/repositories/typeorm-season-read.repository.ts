import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonReadRepository } from 'src/modules/seasons/application/ports/season-read.repository';
import { SeasonOrmEntity } from '../entities/season.orm-entity';

@Injectable()
export class TypeOrmSeasonReadRepository implements SeasonReadRepository {
  constructor(
    @InjectRepository(SeasonOrmEntity)
    private readonly repository: Repository<SeasonOrmEntity>,
  ) {}

  async findAll(competitionId?: string): Promise<SeasonOrmEntity[]> {
    const where = competitionId ? { competitionId } : {};
    return this.repository.find({
      where,
      relations: ['competition'],
      order: { startDate: 'DESC' },
    });
  }

  async findByCompetition(competitionId: string): Promise<SeasonOrmEntity[]> {
    return this.findAll(competitionId);
  }

  async findById(id: string): Promise<SeasonOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['competition'],
    });
  }

  async findCurrentByCompetitionId(
    competitionId: string,
  ): Promise<SeasonOrmEntity | null> {
    const marked = await this.repository.findOne({
      where: { competitionId, isCurrent: true },
      relations: ['competition'],
    });

    if (marked) {
      const hasTeams = await this.repository.manager
        .createQueryBuilder()
        .select('1')
        .from('season_teams', 'st')
        .where('st.season_id = :seasonId', { seasonId: marked.id })
        .limit(1)
        .getRawOne();

      if (hasTeams) {
        return marked;
      }
    }

    // Fallback: season that actually has season_teams data
    const fallback = await this.repository
      .createQueryBuilder('season')
      .leftJoinAndSelect('season.competition', 'competition')
      .innerJoin('season_teams', 'st', 'st.season_id = season.id')
      .where('season.competitionId = :competitionId', { competitionId })
      .orderBy('season.startDate', 'DESC')
      .getOne();

    return fallback || marked || null;
  }
}
