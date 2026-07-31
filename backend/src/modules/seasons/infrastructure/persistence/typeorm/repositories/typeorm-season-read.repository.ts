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

  async findByCompetition(competitionId: string): Promise<SeasonOrmEntity[]> {
    return this.repository.find({
      where: { competitionId },
      relations: ['competition'],
      order: { startDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<SeasonOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['competition'],
    });
  }
}
