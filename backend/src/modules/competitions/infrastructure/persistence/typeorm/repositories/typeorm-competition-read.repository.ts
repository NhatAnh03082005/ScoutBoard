import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetitionReadRepository } from 'src/modules/competitions/application/ports/competition-read.repository';
import { CompetitionOrmEntity } from '../entities/competition.orm-entity';

@Injectable()
export class TypeOrmCompetitionReadRepository implements CompetitionReadRepository {
  constructor(
    @InjectRepository(CompetitionOrmEntity)
    private readonly repository: Repository<CompetitionOrmEntity>,
  ) {}

  async findAll(): Promise<CompetitionOrmEntity[]> {
    return this.repository.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<CompetitionOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }
}
