import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchReadRepository } from 'src/modules/matches/application/ports/match-read.repository';
import { MatchOrmEntity } from '../entities/match.orm-entity';

@Injectable()
export class TypeOrmMatchReadRepository implements MatchReadRepository {
  constructor(
    @InjectRepository(MatchOrmEntity)
    private readonly repository: Repository<MatchOrmEntity>,
  ) {}

  async findById(id: string): Promise<MatchOrmEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['competition', 'season', 'homeTeam', 'awayTeam'],
    });
  }

  async findByCompetitionAndSeason(
    competitionId: string,
    seasonId: string,
  ): Promise<MatchOrmEntity[]> {
    return this.repository.find({
      where: { competitionId, seasonId },
      relations: ['homeTeam', 'awayTeam'],
      order: { matchDate: 'DESC' },
    });
  }
}
