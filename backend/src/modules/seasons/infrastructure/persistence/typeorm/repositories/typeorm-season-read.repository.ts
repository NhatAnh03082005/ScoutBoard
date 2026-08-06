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
    return this.repository.findOne({
      where: { competitionId, isCurrent: true },
      relations: ['competition'],
    });
  }
}
