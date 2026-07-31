import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamReadRepository } from 'src/modules/teams/application/ports/team-read.repository';
import { TeamOrmEntity } from '../entities/team.orm-entity';

@Injectable()
export class TypeOrmTeamReadRepository implements TeamReadRepository {
  constructor(
    @InjectRepository(TeamOrmEntity)
    private readonly repository: Repository<TeamOrmEntity>,
  ) {}

  async findAll(): Promise<TeamOrmEntity[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<TeamOrmEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
